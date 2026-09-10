import User from "../models/User.js";
import Masjid from "../models/Masjid.js";
import PrayerMaster from "../models/PrayerMaster.js";
import SalahLog from "../models/SalahLog.js";
import { getEffectivePrayerTimes, isValidDateStr } from "../services/prayerTimeService.js";
import { generateSalahReflection } from "../services/aiProviderService.js";

const HISTORY_DAYS = 7;
const PUBLIC_STATUS = "approved";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Every "Fard" (the 5 daily obligatory) row + whether the current user
// logged it done on `dateStr` — the single building block every endpoint
// below composes from, so "what counts as done" is defined in exactly one
// place.
async function buildDaySummary(userId, masjidId, dateStr) {
  const [roster, logs] = await Promise.all([
    getEffectivePrayerTimes(masjidId, dateStr),
    SalahLog.findAll({ where: { userId, date: dateStr } }),
  ]);
  const doneIds = new Set(logs.map((l) => l.prayerId));
  const prayers = roster
    .filter((r) => r.category === "Fard")
    .map((r) => ({ prayerId: r.prayerId, name: r.name, time: r.time, completed: doneIds.has(r.prayerId) }));
  const completedCount = prayers.filter((p) => p.completed).length;
  return { date: dateStr, prayers, completedCount, total: prayers.length };
}

async function getUserPrimaryMasjidId(userId) {
  const user = await User.findByPk(userId, { attributes: ["primaryMasjidId"] });
  if (!user?.primaryMasjidId) return null;
  const masjid = await Masjid.findOne({ where: { id: user.primaryMasjidId, status: PUBLIC_STATUS } });
  return masjid ? masjid.id : null;
}

// Walks backward from `fromDateStr`, counting consecutive fully-completed
// (5/5) days. Stops at the first incomplete or empty day it finds.
async function computeStreak(userId, masjidId, fromDateStr) {
  let streak = 0;
  let cursor = fromDateStr;
  // A hard cap keeps this from ever scanning unbounded history.
  for (let i = 0; i < 365; i++) {
    const summary = await buildDaySummary(userId, masjidId, cursor);
    if (summary.total === 0 || summary.completedCount < summary.total) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export const getDay = async (req, res) => {
  try {
    const dateStr = req.query.date || todayStr();
    if (!isValidDateStr(dateStr)) return res.status(400).json({ message: "Invalid date." });

    const masjidId = await getUserPrimaryMasjidId(req.user.id);
    if (!masjidId) return res.json({ hasPrimaryMasjid: false });

    const summary = await buildDaySummary(req.user.id, masjidId, dateStr);
    res.json({ hasPrimaryMasjid: true, ...summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markDone = async (req, res) => {
  try {
    const { prayerId, date } = req.body;
    const dateStr = date || todayStr();
    if (!isValidDateStr(dateStr)) return res.status(400).json({ message: "Invalid date." });

    const masjidId = await getUserPrimaryMasjidId(req.user.id);
    if (!masjidId) return res.status(400).json({ message: "Set a Primary Masjid first." });

    const prayer = await PrayerMaster.findOne({ where: { id: prayerId, category: "Fard" } });
    if (!prayer) return res.status(400).json({ message: "That isn't a trackable prayer." });

    await SalahLog.findOrCreate({ where: { userId: req.user.id, prayerId, date: dateStr } });

    const summary = await buildDaySummary(req.user.id, masjidId, dateStr);

    let aiMessage = null;
    if (summary.total > 0 && summary.completedCount === summary.total && dateStr === todayStr()) {
      const streakBefore = await computeStreak(req.user.id, masjidId, addDays(dateStr, -1));
      const statsContext =
        streakBefore > 0
          ? `Today: ${summary.total}/${summary.total} prayers completed. The user is on a ${streakBefore + 1}-day streak of completing all prayers.`
          : `Today: ${summary.total}/${summary.total} prayers completed.`;
      const languageCode = req.body.languageCode || "en";
      const result = await generateSalahReflection({ kind: "daily_complete", statsContext, languageCode });
      aiMessage = result?.message || null;
    }

    res.json({ ...summary, aiMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unmarkDone = async (req, res) => {
  try {
    const { prayerId, date } = req.body;
    const dateStr = date || todayStr();
    if (!isValidDateStr(dateStr)) return res.status(400).json({ message: "Invalid date." });

    const masjidId = await getUserPrimaryMasjidId(req.user.id);
    if (!masjidId) return res.status(400).json({ message: "Set a Primary Masjid first." });

    await SalahLog.destroy({ where: { userId: req.user.id, prayerId, date: dateStr } });

    const summary = await buildDaySummary(req.user.id, masjidId, dateStr);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || HISTORY_DAYS, 31);
    const masjidId = await getUserPrimaryMasjidId(req.user.id);
    if (!masjidId) return res.json({ hasPrimaryMasjid: false, days: [] });

    const today = todayStr();
    const dates = Array.from({ length: days }, (_, i) => addDays(today, -i));
    const summaries = await Promise.all(dates.map((d) => buildDaySummary(req.user.id, masjidId, d)));
    res.json({
      hasPrimaryMasjid: true,
      days: summaries.map((s) => ({
        date: s.date,
        completedCount: s.completedCount,
        total: s.total,
        prayers: s.prayers.map((p) => ({ prayerId: p.prayerId, name: p.name, completed: p.completed })),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWeeklySummary = async (req, res) => {
  try {
    const masjidId = await getUserPrimaryMasjidId(req.user.id);
    if (!masjidId) return res.json({ hasPrimaryMasjid: false });

    const today = todayStr();
    const dates = Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(today, -i));
    const summaries = await Promise.all(dates.map((d) => buildDaySummary(req.user.id, masjidId, d)));

    const completeDays = summaries.filter((s) => s.total > 0 && s.completedCount === s.total).length;
    const totalCompleted = summaries.reduce((sum, s) => sum + s.completedCount, 0);
    const totalPossible = summaries.reduce((sum, s) => sum + s.total, 0);
    const best = summaries.reduce((acc, s) => (!acc || s.completedCount > acc.completedCount ? s : acc), null);
    const currentStreak = await computeStreak(req.user.id, masjidId, today);

    const statsContext = `Last ${HISTORY_DAYS} days: ${completeDays} fully-complete days, ${totalCompleted}/${totalPossible} total prayers completed, current streak ${currentStreak} day(s).`;
    const languageCode = req.query.languageCode || "en";
    const result = await generateSalahReflection({ kind: "weekly", statsContext, languageCode });

    res.json({
      hasPrimaryMasjid: true,
      completeDays,
      totalCompleted,
      totalPossible,
      bestDay: best && best.completedCount > 0 ? { date: best.date, completedCount: best.completedCount, total: best.total } : null,
      currentStreak,
      aiReflection: result?.message || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
