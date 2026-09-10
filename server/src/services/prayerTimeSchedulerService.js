import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import { ensurePrayerScheduleForMasjid } from "./prayerCalculationEngine.js";

// Same stateless setInterval-tick pattern as masjidBotSchedulerService.js —
// but this is pure CPU-bound math against our own DB, no external API
// quota to protect, so it runs roughly once a day rather than every 60s.
const TICK_INTERVAL_MS = 24 * 60 * 60 * 1000;

let lastRun = null;
let lastError = null;

export function getPrayerTimeSchedulerState() {
  return { lastRun, lastError };
}

async function tick() {
  const masjids = await Masjid.findAll({
    where: { latitude: { [Op.ne]: null }, longitude: { [Op.ne]: null } },
    attributes: ["id"],
  });

  for (const { id } of masjids) {
    try {
      await ensurePrayerScheduleForMasjid(id);
    } catch (error) {
      lastError = { masjidId: id, message: error.message, at: new Date() };
      console.error(`ensurePrayerScheduleForMasjid failed for masjid ${id}:`, error.message);
      // One bad masjid must never stop the rest of the run.
    }
  }

  lastRun = new Date();
}

let interval = null;

/**
 * Started once from server.js, alongside the other schedulers. Unlike
 * those (which only fire on their first *interval*), this one also fires
 * `tick()` once immediately (fire-and-forget — not awaited, so it never
 * blocks app.listen) — that immediate first run, iterating every masjid
 * with known coordinates, IS the one-time backfill of all existing
 * masjids. There is no separate migration script; every later daily tick
 * just tops up whatever's newly missing (the rolling window's newest day,
 * plus any masjid whose location was only just set).
 */
export function startPrayerTimeScheduler() {
  tick().catch((e) => console.error("prayerTimeScheduler initial tick failed:", e.message));
  interval = setInterval(() => tick().catch((e) => console.error("prayerTimeScheduler tick failed:", e.message)), TICK_INTERVAL_MS);
}
