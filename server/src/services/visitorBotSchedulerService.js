import { Op } from "sequelize";
import VisitorBotSettings from "../models/VisitorBotSettings.js";
import VisitorSession from "../models/VisitorSession.js";
import { generateSyntheticVisit } from "./syntheticVisitorService.js";

// Deliberately stateless: no persisted "next scheduled time" and no
// in-memory timer list. Every tick re-derives "how many synthetic visits
// already happened this hour" straight from the database and generates
// only what's still owed — so a pm2 restart mid-hour (or the process being
// down for a while) just resumes the same catch-up math next tick, with no
// special-case recovery code needed at all. Only lastError/lastGenerated
// are kept in memory, purely for the admin Monitoring panel — losing them
// on a restart is harmless (they're informational, not authoritative).
let lastError = null;
let lastGenerated = null;

export function getBotSchedulerState() {
  return { lastError, lastGenerated };
}

function isWithinActiveHours(hour, start, end) {
  if (start == null || end == null) return true;
  if (start === end) return true; // a zero-width window reads as "always on", not "never"
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

async function tick() {
  const settings = await VisitorBotSettings.findByPk(1);
  if (!settings?.enabled) return;

  const now = new Date();
  if (!isWithinActiveHours(now.getUTCHours(), settings.activeHourStart, settings.activeHourEnd)) return;

  const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0));
  const alreadyGenerated = await VisitorSession.count({ where: { trafficType: "synthetic", startedAt: { [Op.gte]: hourStart } } });
  const remainingQuota = settings.visitorsPerHour - alreadyGenerated;
  if (remainingQuota <= 0) return;

  const remainingMinutes = Math.max(60 - now.getUTCMinutes(), 1);
  // In the closing minute of the hour, generate everything still owed (the
  // catch-up case after downtime); otherwise a single probabilistic draw
  // spreads the quota randomly across the remaining minutes.
  const toGenerate = remainingMinutes <= 1 ? remainingQuota : (Math.random() < remainingQuota / remainingMinutes ? 1 : 0);

  for (let i = 0; i < toGenerate; i++) {
    try {
      lastGenerated = await generateSyntheticVisit(settings);
    } catch (error) {
      lastError = { message: error.message, at: new Date() };
      console.error("generateSyntheticVisit failed:", error.message);
    }
  }
}

let interval = null;

/** Started once from server.js, alongside startVisitorMaintenance(). */
export function startVisitorBotScheduler() {
  interval = setInterval(() => tick().catch((e) => console.error("visitorBotScheduler tick failed:", e.message)), 60 * 1000);
}
