import crypto from "crypto";
import { Op } from "sequelize";
import Visitor from "../models/Visitor.js";
import VisitorSession from "../models/VisitorSession.js";
import VisitorPageView from "../models/VisitorPageView.js";
import VisitorSettings from "../models/VisitorSettings.js";
import VisitorBotSettings from "../models/VisitorBotSettings.js";
import { countryFromTimezone } from "../constants/timezoneCountries.js";
import { bumpPublicTotal, getPublicTotal } from "./visitorStatsService.js";
import { schedulePublicBroadcast } from "./visitorRealtimeService.js";

const BOT_UA_PATTERN = /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot/i;

function categorizeScreen(width) {
  if (!width) return null;
  if (width < 576) return "small";
  if (width < 992) return "medium";
  if (width < 1440) return "large";
  return "xlarge";
}

function hostFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}

/** Called on every page view (initial load + client-side route change).
 * Returns null when tracking is disabled or the request is a detected bot
 * with countBots off — the caller (controller) just responds 204 either way,
 * since a visitor never needs to know tracking happened or didn't.
 *
 * `trafficType` and `now` are the two hooks syntheticVisitorService.js uses
 * to reuse this exact function for demo/test traffic: "synthetic" skips the
 * public-counter bump/broadcast below (a bot must never move the number
 * real visitors see) and stamps every created row so it's excluded from
 * genuine analytics by default; `now` lets a synthetic visit backdate its
 * whole fabricated session in one pass instead of over real wall-clock time. */
export async function recordPageView({ visitorKey, path, title, referrer, utmSource, utmMedium, utmCampaign, screenWidth, timezone, language, requestContext, userId, trafficType = "genuine", now = new Date() }) {
  const settings = await VisitorSettings.findByPk(1);
  if (!settings.trackingEnabled) return null;

  const isBot = BOT_UA_PATTERN.test(requestContext.userAgent || "");
  if (isBot && !settings.countBots) return null;

  let visitor = await Visitor.findOne({ where: { visitorKey } });
  const isNewVisitor = !visitor;
  const { country, countryCode } = countryFromTimezone(timezone);

  if (!visitor) {
    visitor = await Visitor.create({
      visitorKey, firstSeenAt: now, lastSeenAt: now, sessionCount: 1, pageViewCount: 0,
      lastDeviceType: requestContext.deviceType, lastCountry: country, lastUserId: userId || null, isBot, trafficType,
    });
  }

  const previousLastSeenAt = visitor.lastSeenAt;
  const timeoutMs = settings.sessionTimeoutMinutes * 60 * 1000;
  const latestSession = await VisitorSession.findOne({ where: { visitorId: visitor.id }, order: [["startedAt", "DESC"]] });
  const reuseSession = latestSession && latestSession.status !== "ended" && now - new Date(latestSession.lastActivityAt) < timeoutMs;

  let session;
  if (reuseSession) {
    session = latestSession;
    session.lastActivityAt = now;
    session.pageCount += 1;
    session.exitPath = path;
    session.durationSeconds = Math.round((now - new Date(session.startedAt)) / 1000);
    session.status = "active";
    await session.save();
  } else {
    // A brand-new Visitor is always "new"; otherwise "returning" unless
    // their previous visit predates the configured returning window, in
    // which case this session is classified as "new" again (a deliberate,
    // admin-configurable re-acquisition rule) — this never re-inserts a
    // Visitor row or double-counts the public total, only the session's
    // own new-vs-returning label.
    const returningWindowMs = settings.returningWindowDays * 24 * 60 * 60 * 1000;
    const staleReturn = previousLastSeenAt && now - new Date(previousLastSeenAt) > returningWindowMs;
    const visitorType = isNewVisitor || staleReturn ? "new" : "returning";

    session = await VisitorSession.create({
      sessionKey: crypto.randomUUID(),
      visitorId: visitor.id,
      userId: userId || null,
      visitorType,
      startedAt: now,
      lastActivityAt: now,
      pageCount: 1,
      landingPath: path,
      exitPath: path,
      referrerHost: hostFromUrl(referrer),
      referrerUrl: referrer || null,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      deviceType: requestContext.deviceType,
      deviceName: requestContext.deviceName,
      browser: requestContext.browser,
      browserVersion: requestContext.browserVersion,
      os: requestContext.os,
      platform: requestContext.platform,
      screenCategory: categorizeScreen(screenWidth),
      language: language || null,
      timezone: timezone || null,
      country,
      countryCode,
      countrySource: country ? "timezone" : "unknown",
      status: "active",
      isBot,
      trafficType,
      ipAddress: requestContext.ipAddress,
    });
    if (!isNewVisitor) visitor.sessionCount += 1;
  }

  visitor.lastSeenAt = now;
  visitor.pageViewCount += 1;
  visitor.lastDeviceType = requestContext.deviceType;
  if (country) visitor.lastCountry = country;
  if (userId) visitor.lastUserId = userId;
  await visitor.save();

  await VisitorPageView.create({
    sessionId: session.id, visitorId: visitor.id, sequence: session.pageCount, path, title: title || null, viewedAt: now, trafficType,
  });

  // A genuine new visitor always moves the public counter. A synthetic one
  // only does when the admin has explicitly turned on
  // VisitorBotSettings.combinedViewDefault (see getPublicTotal's own
  // comment) — off by default, so the public number stays genuine-only
  // unless an admin has made that deliberate choice.
  if (isNewVisitor) {
    if (trafficType === "genuine") {
      bumpPublicTotal();
      schedulePublicBroadcast(getPublicTotal);
    } else {
      const botSettings = await VisitorBotSettings.findByPk(1);
      if (botSettings?.combinedViewDefault) {
        bumpPublicTotal();
        schedulePublicBroadcast(getPublicTotal);
      }
    }
  }

  return { sessionKey: session.sessionKey, isNewVisitor };
}

/** Heartbeat — keeps a session "active" between page views without
 * recording a page view or bumping pageCount. */
export async function recordHeartbeat({ visitorKey }) {
  const visitor = await Visitor.findOne({ where: { visitorKey } });
  if (!visitor) return;
  const session = await VisitorSession.findOne({ where: { visitorId: visitor.id }, order: [["startedAt", "DESC"]] });
  if (!session || session.status === "ended") return;
  session.lastActivityAt = new Date();
  session.durationSeconds = Math.round((session.lastActivityAt - new Date(session.startedAt)) / 1000);
  await session.save();
  visitor.lastSeenAt = session.lastActivityAt;
  await visitor.save();
}

/** Best-effort session close from navigator.sendBeacon on page unload — not
 * load-bearing (visitorMaintenanceService.js's idle sweep is the real
 * source of truth), just closes things a little more promptly when it does
 * arrive. */
export async function endSession({ visitorKey }) {
  const visitor = await Visitor.findOne({ where: { visitorKey } });
  if (!visitor) return;
  const session = await VisitorSession.findOne({ where: { visitorId: visitor.id, status: { [Op.ne]: "ended" } }, order: [["startedAt", "DESC"]] });
  if (!session) return;
  const now = new Date();
  session.status = "ended";
  session.endedAt = now;
  session.durationSeconds = Math.round((now - new Date(session.startedAt)) / 1000);
  await session.save();
}
