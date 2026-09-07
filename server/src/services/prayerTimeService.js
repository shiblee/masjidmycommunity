import { Op } from "sequelize";
import PrayerMaster from "../models/PrayerMaster.js";
import MasjidPrayerTimeline from "../models/MasjidPrayerTimeline.js";
import MasjidPrayerTimeChangeLog from "../models/MasjidPrayerTimeChangeLog.js";

// This module is the single place the "Effective Prayer Time" rule lives —
// so the owner UI, the admin tab, and every public display surface all
// compute the same answer from the same code path.
//
// The model: a prayer time is effective from the date it's set, forward,
// until the next explicit change for that prayer — no separate "recurring
// rule" vs "override" concept. Within a year that's a plain forward-fill.
// Across a year boundary, a date with no explicit row of its own inherits
// the PREVIOUS YEAR's own forward-filled value for that same calendar date
// — which chains (2026 -> 2027 -> 2028 -> ...) rather than always
// reaching back to the original entry, once a later year gets its own
// explicit change.

function parseDateStr(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

/** Normalizes a Sequelize DATEONLY value (usually already a "YYYY-MM-DD" string, but not guaranteed across drivers) to a plain date string. */
function toDateStr(value) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function monthDay(dateStr) {
  const { month, day } = parseDateStr(dateStr);
  return month * 100 + day;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(time) {
  return typeof time === "string" && TIME_RE.test(time);
}

export function isValidDateStr(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const { year, month, day } = parseDateStr(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * The row that determines a prayer's effective time on `dateStr`, or null
 * if never configured. Candidates are every timeline row for this
 * masjid+prayer with (month,day) <= the target's (month,day) — applied to
 * EVERY year, not just the target year (a plain "effectiveDate <= target"
 * comparison would be wrong: it would let a December change bleed into the
 * following January before that year has any data of its own). Among
 * candidates, the answer is the one from the highest year, and within that
 * year the latest date — which is exactly "this year's own value if it has
 * one by this point, else inherit last year's value for this same date,
 * else the year before that, etc."
 */
async function findEffectiveRow(masjidId, prayerId, dateStr) {
  const { year: targetYear } = parseDateStr(dateStr);
  const targetMd = monthDay(dateStr);

  const rows = await MasjidPrayerTimeline.findAll({
    where: { masjidId, prayerId, effectiveDate: { [Op.lte]: `${targetYear}-12-31` } },
  });

  const candidates = rows.filter((r) => {
    const rDateStr = toDateStr(r.effectiveDate);
    const { year } = parseDateStr(rDateStr);
    return year <= targetYear && monthDay(rDateStr) <= targetMd;
  });
  if (!candidates.length) return null;

  const maxYear = Math.max(...candidates.map((r) => parseDateStr(toDateStr(r.effectiveDate)).year));
  return candidates
    .filter((r) => parseDateStr(toDateStr(r.effectiveDate)).year === maxYear)
    .reduce((a, b) => (toDateStr(a.effectiveDate) > toDateStr(b.effectiveDate) ? a : b));
}

/**
 * Every active prayer's effective time for one masjid on one date, plus
 * where that value came from:
 *  - "set": a timeline row exists dated exactly `dateStr` — the masjid is
 *    looking at the date they actually typed this value in.
 *  - "carried": inherited from an earlier date (this year or a previous
 *    year) — `originDate` names that date.
 *  - "none": never configured.
 */
export async function getEffectivePrayerTimes(masjidId, dateStr) {
  const prayers = await PrayerMaster.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });

  return Promise.all(
    prayers.map(async (p) => {
      const row = await findEffectiveRow(masjidId, p.id, dateStr);
      if (!row) return { prayerId: p.id, name: p.name, category: p.category, time: null, source: "none", originDate: null, updatedAt: null };
      const originDate = toDateStr(row.effectiveDate);
      return {
        prayerId: p.id, name: p.name, category: p.category, time: row.time,
        source: originDate === dateStr ? "set" : "carried",
        originDate, updatedAt: row.updatedAt,
      };
    })
  );
}

/**
 * Sets a prayer's time effective from `dateStr` forward — upserts the
 * (masjidId, prayerId, dateStr) row. Never touches any other date's row;
 * every other date's effective time is computed fresh from
 * getEffectivePrayerTimes, so this one write is all a change ever needs.
 * Always logs one MasjidPrayerTimeChangeLog row (the value that was
 * effective for this date before the change -> the new value).
 */
export async function saveEffectivePrayerTime({ masjidId, prayerId, dateStr, time, actor }) {
  const before = await getEffectivePrayerTimes(masjidId, dateStr);
  const oldValue = before.find((e) => e.prayerId === prayerId)?.time ?? null;

  const [row, created] = await MasjidPrayerTimeline.findOrCreate({
    where: { masjidId, prayerId, effectiveDate: dateStr },
    defaults: { time },
  });
  if (!created && row.time !== time) {
    row.time = time;
    await row.save();
  }

  if (oldValue !== time) {
    await MasjidPrayerTimeChangeLog.create({
      masjidId,
      prayerId,
      effectiveDate: dateStr,
      oldValue,
      newValue: time,
      actorType: actor?.type || "user",
      actorName: actor?.name || null,
    });
  }
}

/** Distinct dates within a calendar month that carry an explicit timeline edit for any prayer — powers the Calendar View's highlighting. */
export async function listChangeDatesInMonth(masjidId, year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const rows = await MasjidPrayerTimeline.findAll({
    where: { masjidId, effectiveDate: { [Op.between]: [start, end] } },
    attributes: ["effectiveDate"],
  });
  return [...new Set(rows.map((r) => toDateStr(r.effectiveDate)))];
}

export async function getPrayerTimeHistory(masjidId, { page = 1, limit = 20 } = {}) {
  const { rows, count } = await MasjidPrayerTimeChangeLog.findAndCountAll({
    where: { masjidId },
    order: [["createdAt", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  const prayerIds = [...new Set(rows.map((r) => r.prayerId))];
  const prayers = await PrayerMaster.findAll({ where: { id: prayerIds }, attributes: ["id", "name"] });
  const nameById = new Map(prayers.map((p) => [p.id, p.name]));
  return {
    total: count,
    entries: rows.map((r) => ({ ...r.toJSON(), prayerName: nameById.get(r.prayerId) || "Unknown" })),
  };
}
