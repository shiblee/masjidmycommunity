import crypto from "crypto";
import { Op, fn } from "sequelize";
import Masjid from "../models/Masjid.js";
import VisitorSession from "../models/VisitorSession.js";
import { INDIA_CITIES, INTERNATIONAL_CITIES, pickRandom } from "../constants/syntheticGeo.js";
import { recordPageView } from "./visitorTrackingService.js";

// Generates one fully-formed, already-completed "visit" through the exact
// same recordPageView() pipeline real visitors use, then finalizes the
// session directly. Per the locked product decision, this is written as a
// single historical record with backdated timestamps — never held open in
// real time — so the scheduler that calls this stays fully stateless and
// safe to interrupt at any point (see visitorBotSchedulerService.js).
//
// Every row this creates is stamped trafficType:"synthetic" (via
// recordPageView's parameter) and a fresh, single-use visitorKey, so it can
// never collide with or be mistaken for a genuine visitor's session.

const DEFAULT_ALLOWED_PATHS = [
  "/", "/explore-masjids", "/explore-campaigns", "/how-it-works", "/our-impact",
  "/about", "/testimonials", "/success-stories", "/faq", "/contact",
];

const BROWSER_VERSIONS = { Chrome: "124.0.0.0", Safari: "17.4", Firefox: "125.0", Edge: "124.0.0.0" };

const DEVICE_NAMES = {
  mobile: ["iPhone 15", "iPhone 14", "Samsung Galaxy S23", "Google Pixel 8", "OnePlus 12"],
  tablet: ["iPad Air", "Samsung Galaxy Tab S9"],
  desktop: [null],
};

function weightedPick(weights) {
  const entries = Object.entries(weights || {}).filter(([, w]) => Number(w) > 0);
  if (!entries.length) return null;
  const total = entries.reduce((sum, [, w]) => sum + Number(w), 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= Number(w);
    if (r < 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function osFor(browser, deviceType) {
  if (browser === "Safari") {
    if (deviceType === "desktop") return pickRandom(["macOS 14", "macOS 13"]);
    if (deviceType === "tablet") return "iPadOS 17";
    return pickRandom(["iOS 17", "iOS 16"]);
  }
  if (deviceType === "desktop") return pickRandom(["Windows 10", "Windows 11", "macOS 14"]);
  if (deviceType === "tablet") return pickRandom(["Android 13", "iPadOS 17"]);
  return pickRandom(["Android 14", "Android 13"]);
}

function screenWidthFor(deviceType) {
  if (deviceType === "mobile") return 390;
  if (deviceType === "tablet") return 820;
  return 1440;
}

/** Randomly mixes in a handful of real masjid profile paths so simulated
 * browsing isn't limited to static marketing pages — only when the admin
 * hasn't configured an explicit path list of their own (an explicit list
 * means "only ever use these paths", not "these plus some extras"). */
async function resolvePathPool(settings) {
  if (Array.isArray(settings.allowedPaths) && settings.allowedPaths.length) {
    return settings.allowedPaths;
  }
  try {
    const masjids = await Masjid.findAll({
      attributes: ["slug"],
      where: { slug: { [Op.ne]: null } },
      order: fn("RAND"),
      limit: 5,
    });
    const slugPaths = masjids.map((m) => `/masjid/${m.slug}`).filter(Boolean);
    return [...DEFAULT_ALLOWED_PATHS, ...slugPaths];
  } catch {
    return DEFAULT_ALLOWED_PATHS;
  }
}

export async function generateSyntheticVisit(settings) {
  const isIndia = Math.random() * 100 < settings.indiaPercent;
  const geo = pickRandom(isIndia ? INDIA_CITIES : INTERNATIONAL_CITIES);

  const deviceType = weightedPick(settings.deviceWeights) || "desktop";
  const browser = weightedPick(settings.browserWeights) || "Chrome";
  const os = osFor(browser, deviceType);
  const deviceName = pickRandom(DEVICE_NAMES[deviceType] || [null]);

  const durationSeconds = randInt(settings.sessionDurationMinSeconds, settings.sessionDurationMaxSeconds);
  const pageCount = randInt(settings.pagesPerSessionMin, settings.pagesPerSessionMax);
  const pool = await resolvePathPool(settings);
  const paths = Array.from({ length: pageCount }, () => pickRandom(pool));

  const now = new Date();
  const sessionStart = new Date(now.getTime() - durationSeconds * 1000);
  const timestamps = pageCount === 1
    ? [sessionStart]
    : Array.from({ length: pageCount }, (_, i) => new Date(sessionStart.getTime() + (i * durationSeconds * 1000) / (pageCount - 1)));

  const visitorKey = crypto.randomUUID();
  const requestContext = {
    ipAddress: null,
    // Deliberately avoids the substring "bot" — recordPageView's own
    // BOT_UA_PATTERN crawler-detection guard would otherwise treat every
    // synthetic visit as a detected web crawler and (with countBots off,
    // the default) silently drop it.
    userAgent: "MMC-SyntheticVisitorSimulator/1.0",
    platform: "web",
    browser,
    browserVersion: BROWSER_VERSIONS[browser] || null,
    os,
    deviceType,
    deviceName,
  };

  let result = null;
  for (let i = 0; i < paths.length; i++) {
    result = await recordPageView({
      visitorKey,
      path: paths[i],
      title: null,
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      screenWidth: screenWidthFor(deviceType),
      timezone: geo.timezone,
      language: geo.countryCode === "IN" ? "en-IN" : "en-US",
      requestContext,
      userId: null,
      trafficType: "synthetic",
      now: timestamps[i],
    });
  }

  if (!result) throw new Error("generateSyntheticVisit produced no session — check bot settings for an empty path pool.");

  const session = await VisitorSession.findOne({ where: { sessionKey: result.sessionKey } });
  if (session) {
    session.city = geo.city;
    session.status = "ended";
    session.endedAt = now;
    session.durationSeconds = durationSeconds;
    await session.save();
  }

  return {
    sessionKey: result.sessionKey,
    city: geo.city,
    country: geo.country,
    deviceType,
    browser,
    durationSeconds,
    pageCount,
    at: now,
  };
}
