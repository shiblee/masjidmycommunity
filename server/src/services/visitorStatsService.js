import { Op, fn, col } from "sequelize";
import Visitor from "../models/Visitor.js";
import VisitorSession from "../models/VisitorSession.js";
import VisitorSettings from "../models/VisitorSettings.js";

// The single source of truth for "how many visitors/sessions" — every
// consumer (the public counter's initial load, its SSE broadcasts, and the
// admin KPI row) reads through this module, same discipline as
// masjidEngagementService.js for Like/Rating/Review/View counts, so the
// number is never computed two different ways in two different places.

// A plain COUNT(*) is cheap even at real scale (an index-only scan on the
// primary key), but this still avoids hitting the DB on every single public
// page view — re-verified opportunistically at most once every 5 minutes;
// every write path that changes the true count (visitorTrackingService.js,
// on a brand-new Visitor row) bumps this in-memory value immediately
// anyway, so it's never stale in practice, only self-healing against drift.
let cachedTotal = null;
let cachedAt = 0;
const CACHE_MS = 5 * 60 * 1000;

export async function getPublicTotal() {
  const now = Date.now();
  if (cachedTotal == null || now - cachedAt > CACHE_MS) {
    cachedTotal = await Visitor.count();
    cachedAt = now;
  }
  return cachedTotal;
}

/** Called the moment a new Visitor row is actually inserted — keeps the
 * cache exact without waiting for the next periodic re-verify. */
export function bumpPublicTotal() {
  if (cachedTotal != null) cachedTotal += 1;
}

async function onlineWhere() {
  const settings = await VisitorSettings.findByPk(1);
  const windowSeconds = settings?.onlineWindowSeconds ?? 120;
  const since = new Date(Date.now() - windowSeconds * 1000);
  return { lastActivityAt: { [Op.gte]: since }, status: { [Op.ne]: "ended" } };
}

export async function getOnlineCount() {
  return VisitorSession.count({ where: await onlineWhere() });
}

/** Powers the admin "Online Now" live widget — one row per currently-active
 * session, most recent first. Deliberately excludes ipAddress. */
export async function getOnlineSessions(limit = 50) {
  const rows = await VisitorSession.findAll({
    where: await onlineWhere(),
    order: [["lastActivityAt", "DESC"]],
    limit,
    attributes: ["sessionKey", "visitorId", "visitorType", "deviceType", "browser", "country", "exitPath", "startedAt", "lastActivityAt"],
  });
  const now = Date.now();
  return rows.map((r) => ({
    sessionKey: r.sessionKey,
    visitorId: r.visitorId,
    visitorType: r.visitorType,
    deviceType: r.deviceType,
    browser: r.browser,
    country: r.country,
    currentPath: r.exitPath,
    durationSeconds: Math.round((now - new Date(r.startedAt).getTime()) / 1000),
  }));
}

export async function getVisitorSummary({ from, to }) {
  const range = { startedAt: { [Op.gte]: from, [Op.lte]: to } };

  const [totalVisitors, todaysVisitors, sessionRows, activeCount] = await Promise.all([
    Visitor.count(),
    Visitor.count({ where: { firstSeenAt: { [Op.gte]: from } } }),
    VisitorSession.findAll({
      where: range,
      attributes: [
        "visitorType",
        [fn("COUNT", col("id")), "count"],
        [fn("AVG", col("durationSeconds")), "avgDuration"],
      ],
      group: ["visitorType"],
      raw: true,
    }),
    getOnlineCount(),
  ]);

  const newCount = Number(sessionRows.find((r) => r.visitorType === "new")?.count || 0);
  const returningCount = Number(sessionRows.find((r) => r.visitorType === "returning")?.count || 0);
  const totalSessions = newCount + returningCount;
  const weightedDuration = sessionRows.reduce((sum, r) => sum + Number(r.avgDuration || 0) * Number(r.count || 0), 0);

  return {
    totalVisitors,
    todaysVisitors,
    activeVisitors: activeCount,
    newVisitors: newCount,
    returningVisitors: returningCount,
    sessions: totalSessions,
    avgSessionDurationSeconds: totalSessions > 0 ? Math.round(weightedDuration / totalSessions) : 0,
  };
}
