import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import Visitor from "../models/Visitor.js";
import VisitorSession from "../models/VisitorSession.js";
import VisitorPageView from "../models/VisitorPageView.js";
import { getVisitorSummary, getOnlineCount, getOnlineSessions } from "../services/visitorStatsService.js";
import { getInsights } from "../services/visitorInsightsService.js";
import { addAdminClient } from "../services/visitorRealtimeService.js";
import VisitorSettings from "../models/VisitorSettings.js";
import VisitorBotSettings from "../models/VisitorBotSettings.js";
import { generateSyntheticVisit } from "../services/syntheticVisitorService.js";
import { getBotSchedulerState } from "../services/visitorBotSchedulerService.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

// EventSource can't send an Authorization header, so the live "Online Now"
// stream can't go through the normal Bearer-token admin middleware — an
// already-authenticated admin exchanges their real token for one of these
// short-lived (60s), single-purpose tickets first (a normal Bearer-checked
// POST), then connects the stream with it as a query param instead. Not
// tracked as single-use server-side (no store for that) — the 60s window
// and admin-only issuance keep the exposure small without that complexity.
export const issueStreamTicket = (req, res) => {
  const ticket = jwt.sign({ adminId: req.user.id, purpose: "visitor-stream" }, process.env.JWT_SECRET, { expiresIn: "60s" });
  res.json({ ticket });
};

export const streamOnline = async (req, res) => {
  try {
    const payload = jwt.verify(req.query.ticket || "", process.env.JWT_SECRET);
    if (payload.purpose !== "visitor-stream") throw new Error("wrong purpose");
  } catch {
    return res.status(401).json({ message: "Invalid or expired stream ticket." });
  }
  const includeSynthetic = req.query.includeSynthetic === "true";
  addAdminClient(req, res, async () => ({ onlineCount: await getOnlineCount(includeSynthetic), sessions: await getOnlineSessions(50, includeSynthetic) }));
};

function parseRange(req) {
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export const getSummary = async (req, res) => {
  try {
    const { from, to } = parseRange(req);
    const summary = await getVisitorSummary({ from, to, includeSynthetic: req.query.includeSynthetic === "true" });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const SETTINGS_FIELDS = [
  "sessionTimeoutMinutes", "onlineWindowSeconds", "heartbeatSeconds", "returningWindowDays",
  "countBots", "countAdmins", "ipRetentionDays", "publicCounterMode", "trackingEnabled",
];

export const getSettings = async (req, res) => {
  try {
    const settings = await VisitorSettings.findByPk(1);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await VisitorSettings.findByPk(1);
    for (const field of SETTINGS_FIELDS) {
      if (req.body[field] !== undefined) settings[field] = req.body[field];
    }
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const BOT_SETTINGS_FIELDS = [
  "enabled", "visitorsPerHour", "indiaPercent", "activeHourStart", "activeHourEnd",
  "allowedPaths", "sessionDurationMinSeconds", "sessionDurationMaxSeconds",
  "pagesPerSessionMin", "pagesPerSessionMax", "deviceWeights", "browserWeights", "combinedViewDefault",
];

export const getBotSettings = async (req, res) => {
  try {
    const settings = await VisitorBotSettings.findByPk(1);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBotSettings = async (req, res) => {
  try {
    const settings = await VisitorBotSettings.findByPk(1);
    const actor = await metaActorFrom(req);
    const fields = [];
    for (const field of BOT_SETTINGS_FIELDS) {
      if (req.body[field] === undefined) continue;
      const oldValue = settings[field];
      const newValue = req.body[field];
      settings[field] = newValue;
      fields.push({
        field,
        oldValue: typeof oldValue === "object" && oldValue !== null ? JSON.stringify(oldValue) : oldValue,
        newValue: typeof newValue === "object" && newValue !== null ? JSON.stringify(newValue) : newValue,
      });
    }
    await settings.save();
    await recordMetaChange({ entityType: "VisitorBotSettings", entityId: 1, entityName: "Visitor Bot Settings", action: "update", actor, fields }).catch(() => {});
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generates and immediately persists one synthetic visit, bypassing the
// scheduler entirely — lets an admin sanity-check their configuration
// (paths, device/browser mix, duration range) without waiting for the
// hourly quota to fire.
export const testRunBot = async (req, res) => {
  try {
    const settings = await VisitorBotSettings.findByPk(1);
    const visit = await generateSyntheticVisit(settings);
    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Deletes every synthetic row this feature has ever created — scoped
// strictly to trafficType:"synthetic", in FK-safe child-to-parent order.
// Never touches a genuine visitor/session/page-view row.
export const resetBotData = async (req, res) => {
  try {
    const sessions = await VisitorSession.findAll({ where: { trafficType: "synthetic" }, attributes: ["id"] });
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length) await VisitorPageView.destroy({ where: { sessionId: sessionIds } });
    await VisitorSession.destroy({ where: { trafficType: "synthetic" } });
    const deletedVisitors = await Visitor.destroy({ where: { trafficType: "synthetic" } });
    res.json({ deletedVisitors, deletedSessions: sessionIds.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Powers the bot Monitoring panel. estimatedNextVisit is a best-effort
// projection (expected wait = remaining minutes / remaining quota this
// hour) — the scheduler is probabilistic, so this is never a guarantee.
export const getBotStatus = async (req, res) => {
  try {
    const settings = await VisitorBotSettings.findByPk(1);
    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0));
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const [generatedThisHour, generatedToday] = await Promise.all([
      VisitorSession.count({ where: { trafficType: "synthetic", startedAt: { [Op.gte]: hourStart } } }),
      VisitorSession.count({ where: { trafficType: "synthetic", startedAt: { [Op.gte]: dayStart } } }),
    ]);
    const remainingQuota = Math.max(settings.visitorsPerHour - generatedThisHour, 0);
    const remainingMinutes = Math.max(60 - now.getUTCMinutes(), 1);
    const state = getBotSchedulerState();

    res.json({
      enabled: settings.enabled,
      visitorsPerHour: settings.visitorsPerHour,
      generatedToday,
      generatedThisHour,
      estimatedNextVisit: settings.enabled && remainingQuota > 0 ? new Date(now.getTime() + (remainingMinutes / remainingQuota) * 60000) : null,
      schedulerStatus: settings.enabled ? "running" : "stopped",
      lastGenerated: state.lastGenerated,
      lastError: state.lastError,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Polling fallback for "Online Now" if the SSE stream can't connect.
export const getOnline = async (req, res) => {
  try {
    const includeSynthetic = req.query.includeSynthetic === "true";
    res.json({ onlineCount: await getOnlineCount(includeSynthetic), sessions: await getOnlineSessions(50, includeSynthetic) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVisitorInsights = async (req, res) => {
  try {
    const { from, to } = parseRange(req);
    const insights = await getInsights({ from, to, includeSynthetic: req.query.includeSynthetic === "true" });
    res.json({ insights });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const SORT_COLUMNS = {
  visitTime: "startedAt",
  type: "visitorType",
  device: "deviceType",
  browser: "browser",
  location: "countryCode",
  pages: "pageCount",
  duration: "durationSeconds",
  status: "status",
};

function buildWhere(req) {
  const { from, to } = parseRange(req);
  const where = { startedAt: { [Op.gte]: from, [Op.lte]: to } };
  if (req.query.type && req.query.type !== "all") where.visitorType = req.query.type;
  if (req.query.status && req.query.status !== "all") where.status = req.query.status;
  if (req.query.device && req.query.device !== "all") where.deviceType = req.query.device;
  if (req.query.browser && req.query.browser !== "all") where.browser = req.query.browser;
  if (req.query.country && req.query.country !== "all") where.countryCode = req.query.country;
  if (req.query.source && req.query.source !== "all") where.referrerHost = req.query.source;
  if (req.query.q) {
    const like = { [Op.like]: `%${req.query.q.trim()}%` };
    where[Op.or] = [{ sessionKey: like }, { landingPath: like }, { exitPath: like }, { referrerHost: like }];
  }
  return where;
}

export const listSessions = async (req, res) => {
  try {
    const where = buildWhere(req);
    const dir = String(req.query.dir).toLowerCase() === "asc" ? "ASC" : "DESC";
    const column = SORT_COLUMNS[req.query.sort] || "startedAt";
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(Number(req.query.pageSize) || 50, 200);

    const { rows, count } = await VisitorSession.findAndCountAll({
      where,
      order: [[column, dir]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const visitorIds = [...new Set(rows.map((r) => r.visitorId))];
    const visitors = await Visitor.findAll({ where: { id: visitorIds }, attributes: ["id", "firstSeenAt"] });
    const visitorById = new Map(visitors.map((v) => [v.id, v]));

    const sessions = rows.map((s) => ({ ...s.toJSON(), visitorFirstSeenAt: visitorById.get(s.visitorId)?.firstSeenAt || null }));

    if (req.query.export === "csv") {
      const allRows = await VisitorSession.findAll({ where, order: [[column, dir]], limit: 50000 });
      return sendCsv(res, allRows);
    }

    res.json({ rows: sessions, total: count, page, pageSize });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function sendCsv(res, rows) {
  const headers = [
    "sessionKey", "visitorId", "visitorType", "startedAt", "endedAt", "durationSeconds", "pageCount",
    "landingPath", "exitPath", "referrerHost", "deviceType", "browser", "os", "country", "status",
  ];
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  res.set("Content-Type", "text/csv");
  res.set("Content-Disposition", `attachment; filename="visitor-sessions-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(lines.join("\n"));
}

export const getSessionDetail = async (req, res) => {
  try {
    const session = await VisitorSession.findOne({ where: { sessionKey: req.params.sessionKey } });
    if (!session) return res.status(404).json({ message: "Session not found." });

    const [visitor, pageViews, priorSessions] = await Promise.all([
      Visitor.findByPk(session.visitorId),
      VisitorPageView.findAll({ where: { sessionId: session.id }, order: [["sequence", "ASC"]] }),
      VisitorSession.count({ where: { visitorId: session.visitorId } }),
    ]);

    res.json({
      session: session.toJSON(),
      visitor: visitor ? { ...visitor.toJSON(), totalSessions: priorSessions } : null,
      pageViews,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
