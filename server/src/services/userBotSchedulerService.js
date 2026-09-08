import { Op } from "sequelize";
import UserBotSettings from "../models/UserBotSettings.js";
import User from "../models/User.js";
import { generateSyntheticUser } from "./syntheticUserGeneratorService.js";

// Stateless, same architecture as visitorBotSchedulerService.js: every tick
// re-derives "how many bot users already exist for this hour/day/total"
// straight from the database and generates only what's still owed. No
// persisted schedule, no in-memory timer list — a restart mid-hour just
// resumes the same query-driven math next tick. Two extra gates beyond the
// Visitor Bot's: maxBotUsersPerDay and maxTotalBotUsers, because these are
// permanent, publicly-visible accounts rather than throwaway analytics rows.
let lastError = null;
let lastGenerated = null;

export function getUserBotSchedulerState() {
  return { lastError, lastGenerated };
}

function isWithinActiveHours(hour, start, end) {
  if (start == null || end == null) return true;
  if (start === end) return true;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

async function tick() {
  const settings = await UserBotSettings.findByPk(1);
  if (!settings?.enabled) return;

  const now = new Date();
  if (!isWithinActiveHours(now.getUTCHours(), settings.activeHourStart, settings.activeHourEnd)) return;

  const totalBotUsers = await User.count({ where: { userType: "bot" } });
  if (settings.maxTotalBotUsers != null && totalBotUsers >= settings.maxTotalBotUsers) return;

  if (settings.maxBotUsersPerDay != null) {
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const generatedToday = await User.count({ where: { userType: "bot", createdAt: { [Op.gte]: dayStart } } });
    if (generatedToday >= settings.maxBotUsersPerDay) return;
  }

  const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0));
  const generatedThisHour = await User.count({ where: { userType: "bot", createdAt: { [Op.gte]: hourStart } } });
  const remainingQuota = settings.usersPerHour - generatedThisHour;
  if (remainingQuota <= 0) return;

  const remainingMinutes = Math.max(60 - now.getUTCMinutes(), 1);
  const toGenerate = remainingMinutes <= 1 ? remainingQuota : (Math.random() < remainingQuota / remainingMinutes ? 1 : 0);

  for (let i = 0; i < toGenerate; i++) {
    try {
      lastGenerated = await generateSyntheticUser(settings);
    } catch (error) {
      lastError = { message: error.message, at: new Date() };
      console.error("generateSyntheticUser failed:", error.message);
    }
  }
}

let interval = null;

/** Started once from server.js, alongside the other bot schedulers. */
export function startUserBotScheduler() {
  interval = setInterval(() => tick().catch((e) => console.error("userBotScheduler tick failed:", e.message)), 60 * 1000);
}
