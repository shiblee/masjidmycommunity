import { Op } from "sequelize";
import MasjidBotSettings from "../models/MasjidBotSettings.js";
import Masjid from "../models/Masjid.js";
import { runDiscoveryCycle } from "./masjidDiscoveryService.js";

// Same stateless, DB-derived-quota architecture as the other two bots this
// session — a 60s tick reloads settings fresh, checks caps, and generates
// only what's still owed for the hour. One addition specific to this bot:
// a single "attempt" retries a few different search cities if the first
// one comes back with nothing genuinely new (a city that's already fully
// covered), rather than silently skipping the tick's quota — the explicit
// requirement here is real forward progress (at least masjidsPerHour
// attempts, each retried, every hour the bot is enabled), not just an
// attempted search.
const MAX_CITY_RETRIES_PER_IMPORT = 3;

let lastError = null;
let lastImported = null;
let apiCallWindowStart = Date.now();
let apiCallsThisWindow = 0;

export function getMasjidBotSchedulerState() {
  return { lastError, lastImported };
}

function isWithinActiveHours(hour, start, end) {
  if (start == null || end == null) return true;
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

function trackApiCalls(maxPerHour) {
  const now = Date.now();
  if (now - apiCallWindowStart > 60 * 60 * 1000) {
    apiCallWindowStart = now;
    apiCallsThisWindow = 0;
  }
  return apiCallsThisWindow < maxPerHour;
}

async function attemptOneImport(settings) {
  for (let i = 0; i < MAX_CITY_RETRIES_PER_IMPORT; i++) {
    if (!trackApiCalls(settings.maxApiCallsPerHour)) return null; // API budget exhausted this hour
    apiCallsThisWindow += 1;
    const imported = await runDiscoveryCycle(settings);
    if (imported) return imported;
    // null means that city's search returned nothing genuinely new — try
    // another city rather than giving up on this tick's quota entirely.
  }
  return null;
}

async function tick() {
  const settings = await MasjidBotSettings.findByPk(1);
  if (!settings?.enabled) return;

  const now = new Date();
  if (!isWithinActiveHours(now.getUTCHours(), settings.activeHourStart, settings.activeHourEnd)) return;

  const totalImported = await Masjid.count({ where: { creationMethod: "bot_import" } });
  if (settings.maxTotalImportedMasjids != null && totalImported >= settings.maxTotalImportedMasjids) return;

  if (settings.maxMasjidsPerDay != null) {
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const importedToday = await Masjid.count({ where: { creationMethod: "bot_import", createdAt: { [Op.gte]: dayStart } } });
    if (importedToday >= settings.maxMasjidsPerDay) return;
  }

  const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0));
  const importedThisHour = await Masjid.count({ where: { creationMethod: "bot_import", createdAt: { [Op.gte]: hourStart } } });
  const remainingQuota = settings.masjidsPerHour - importedThisHour;
  if (remainingQuota <= 0) return;

  const remainingMinutes = Math.max(60 - now.getUTCMinutes(), 1);
  // Same catch-up guarantee as the other two bots: in the closing minute(s),
  // attempt everything still owed this hour rather than leaving it to chance.
  const toAttempt = remainingMinutes <= 2 ? remainingQuota : (Math.random() < remainingQuota / remainingMinutes ? 1 : 0);

  for (let i = 0; i < toAttempt; i++) {
    try {
      const imported = await attemptOneImport(settings);
      if (imported) lastImported = imported;
    } catch (error) {
      lastError = { message: error.message, at: new Date() };
      console.error("runDiscoveryCycle failed:", error.message);
    }
  }
}

let interval = null;

/** Started once from server.js, alongside the other bot schedulers. */
export function startMasjidBotScheduler() {
  interval = setInterval(() => tick().catch((e) => console.error("masjidBotScheduler tick failed:", e.message)), 60 * 1000);
}
