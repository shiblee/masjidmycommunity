import { Op } from "sequelize";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { find as findTimeZones } from "geo-tz";
import Masjid from "../models/Masjid.js";
import PrayerMaster from "../models/PrayerMaster.js";
import MasjidPrayerTimeline from "../models/MasjidPrayerTimeline.js";
import { resolveEffectiveRow } from "./prayerTimeService.js";
import {
  CALCULATION_METHOD_KEY,
  FIXED_PRAYER_DEFAULTS,
  CALCULATED_PRAYER_FIELD_MAP,
  ROLLING_WINDOW_DAYS,
} from "../config/prayerCalculationDefaults.js";

// The single centralized prayer-timing engine — the bot's masjidDiscoveryService.js
// and the owner-facing masjidController.js both call the same
// ensurePrayerScheduleForMasjid() here, per the product requirement that
// manually-registered and bot-created masjids follow identical logic. Also
// called on a daily tick (prayerTimeSchedulerService.js) for every masjid,
// which is what performs the one-time backfill of all existing masjids the
// first time it runs, and keeps the rolling window topped up after that.
//
// Golden rule everywhere in this file: NEVER write a value for a date that
// is already governed by an existing MasjidPrayerTimeline row — whether
// that row was entered by a human or written by this engine in an earlier
// run. Governance is checked via resolveEffectiveRow(), the exact same
// forward-fill algorithm the interactive owner/admin/public read paths use
// (prayerTimeService.js), so "governed" here means exactly what it means
// everywhere else in the app.

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function formatLocalHHmm(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour").value;
  const minute = parts.find((p) => p.type === "minute").value;
  return `${hour}:${minute}`;
}

function computeAstronomicalTimesFor(dateStr, latitude, longitude, timeZone) {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Noon UTC as the "calendar date" input avoids any midnight-boundary edge
  // case in adhan's own date handling — we only read the field outputs,
  // which are absolute instants regardless of what hour we passed in.
  const calendarDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const coordinates = new Coordinates(latitude, longitude);
  const params = CalculationMethod[CALCULATION_METHOD_KEY]();
  const times = new PrayerTimes(coordinates, calendarDate, params);
  return {
    fajr: formatLocalHHmm(times.fajr, timeZone),
    sunrise: formatLocalHHmm(times.sunrise, timeZone),
    maghrib: formatLocalHHmm(times.maghrib, timeZone),
  };
}

// Resolved once per masjid and cached on the row — a later address
// correction won't trigger a re-lookup (see prayerCalculationDefaults.js
// module comment / plan notes: "resolve once, cache forever" is a
// deliberate, documented limitation, not an oversight).
async function resolveTimezone(masjid) {
  if (masjid.timezone) return masjid.timezone;
  const [tz] = findTimeZones(Number(masjid.latitude), Number(masjid.longitude)) || [];
  if (!tz) return null;
  masjid.timezone = tz;
  await masjid.save();
  return tz;
}

/**
 * Idempotent — safe to call repeatedly (e.g. the daily scheduler tick and a
 * manual lat/lng edit landing close together) and safe to call immediately
 * after a masjid is created. Never throws for an expected "can't do
 * anything yet" state (no location, no resolvable timezone) — returns a
 * `{ skipped: reason }` result instead, so callers can log/ignore without
 * special-casing try/catch for the common case.
 */
export async function ensurePrayerScheduleForMasjid(masjidId) {
  const masjid = await Masjid.findByPk(masjidId);
  if (!masjid || masjid.latitude == null || masjid.longitude == null) {
    return { skipped: "no_location" };
  }

  const timeZone = await resolveTimezone(masjid);
  if (!timeZone) return { skipped: "no_timezone" };

  const prayers = await PrayerMaster.findAll({ where: { isActive: true } });
  const byName = new Map(prayers.map((p) => [p.name.trim().toLowerCase(), p]));
  const today = todayStr();

  // --- Fixed-clock-time prayers: at most one row each, only if the masjid
  // has genuinely never had any value for this prayer. ---
  for (const [name, time] of Object.entries(FIXED_PRAYER_DEFAULTS)) {
    const prayer = byName.get(name.toLowerCase());
    if (!prayer) continue;
    const rows = await MasjidPrayerTimeline.findAll({
      where: { masjidId, prayerId: prayer.id, effectiveDate: { [Op.lte]: today } },
    });
    if (resolveEffectiveRow(rows, today)) continue;
    await MasjidPrayerTimeline.create({ masjidId, prayerId: prayer.id, effectiveDate: today, time });
  }

  // --- Date-varying prayers: one row per currently-ungoverned date in the
  // rolling window. ---
  const latitude = Number(masjid.latitude);
  const longitude = Number(masjid.longitude);
  const dates = Array.from({ length: ROLLING_WINDOW_DAYS + 1 }, (_, i) => addDays(today, i));
  const windowEnd = dates[dates.length - 1];

  const calcEntries = {};
  for (const name of Object.keys(CALCULATED_PRAYER_FIELD_MAP)) {
    const prayer = byName.get(name.toLowerCase());
    if (!prayer) continue;
    const rows = await MasjidPrayerTimeline.findAll({
      where: { masjidId, prayerId: prayer.id, effectiveDate: { [Op.lte]: windowEnd } },
    });
    calcEntries[name] = { prayer, rows };
  }

  // Snapshot taken BEFORE any inserts this run — a newly-inserted day-N row
  // must never short-circuit day N+1's check within the same pass, since
  // Fajr/Sunrise/Maghrib genuinely differ every day (unlike a forward-fill
  // that's meant to repeat).
  const unionMissing = new Set();
  for (const { rows } of Object.values(calcEntries)) {
    for (const d of dates) if (!resolveEffectiveRow(rows, d)) unionMissing.add(d);
  }

  // Compute the astronomy once per date (not once per prayer) — Fajr/
  // Sunrise/Maghrib all come out of the same PrayerTimes construction.
  const valuesByDate = {};
  for (const d of unionMissing) {
    valuesByDate[d] = computeAstronomicalTimesFor(d, latitude, longitude, timeZone);
  }

  for (const [name, field] of Object.entries(CALCULATED_PRAYER_FIELD_MAP)) {
    const entry = calcEntries[name];
    if (!entry) continue;
    const toInsert = dates
      .filter((d) => !resolveEffectiveRow(entry.rows, d))
      .map((d) => ({ masjidId, prayerId: entry.prayer.id, effectiveDate: d, time: valuesByDate[d][field] }));
    if (toInsert.length) {
      await MasjidPrayerTimeline.bulkCreate(toInsert, { ignoreDuplicates: true });
    }
  }

  return { ok: true, timeZone };
}
