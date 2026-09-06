import { Op } from "sequelize";
import PrayerMaster from "../models/PrayerMaster.js";
import MasjidPrayerRecurringSchedule from "../models/MasjidPrayerRecurringSchedule.js";
import MasjidPrayerDateOverride from "../models/MasjidPrayerDateOverride.js";
import MasjidPrayerTimeChangeLog from "../models/MasjidPrayerTimeChangeLog.js";

// Bulk actions (copy / apply-to-range) always write as per-date overrides,
// never as the "recurring" scope — they operate on specific dates the owner
// picked, and letting a bulk write silently redefine the yearly default
// would contradict the single-source-of-truth the recurring rule is meant
// to be. Each individual value written still goes through
// saveEffectivePrayerTime() below, so it's logged to the audit trail the
// same as any other change.
export const MAX_RANGE_DAYS = 366;

// This module is the single place the "Effective Prayer Time" priority
// rule lives — date override -> recurring rule (by month/day) -> not
// configured — so the owner UI, the admin tab, and every public display
// surface all compute the same answer from the same code path.

function parseDateStr(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month, day };
}

/** Normalizes a Sequelize DATEONLY value (usually already a "YYYY-MM-DD" string, but not guaranteed across drivers) to a plain date string. */
function toDateStr(value) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
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
 * Every active prayer's effective time for one masjid on one date, plus
 * where that value came from:
 *  - "override": a MasjidPrayerDateOverride exists for this exact date.
 *  - "manual": a recurring rule exists AND this exact date is the one it
 *    was last set from (originDate) — the masjid is looking at the year
 *    they actually typed this value in.
 *  - "recurring": a recurring rule exists, inherited from a different
 *    year's edit.
 *  - "none": nothing configured for this prayer/date at all.
 */
export async function getEffectivePrayerTimes(masjidId, dateStr) {
  const { month, day } = parseDateStr(dateStr);

  const [prayers, overrides, recurring] = await Promise.all([
    PrayerMaster.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] }),
    MasjidPrayerDateOverride.findAll({ where: { masjidId, date: dateStr } }),
    MasjidPrayerRecurringSchedule.findAll({ where: { masjidId, month, day } }),
  ]);

  const overrideByPrayer = new Map(overrides.map((o) => [o.prayerId, o]));
  const recurringByPrayer = new Map(recurring.map((r) => [r.prayerId, r]));

  return prayers.map((p) => {
    const override = overrideByPrayer.get(p.id);
    if (override) {
      return { prayerId: p.id, name: p.name, category: p.category, time: override.time, source: "override", updatedAt: override.updatedAt };
    }
    const rule = recurringByPrayer.get(p.id);
    if (rule) {
      const source = toDateStr(rule.originDate) === dateStr ? "manual" : "recurring";
      return { prayerId: p.id, name: p.name, category: p.category, time: rule.time, source, updatedAt: rule.updatedAt };
    }
    return { prayerId: p.id, name: p.name, category: p.category, time: null, source: "none", updatedAt: null };
  });
}

/**
 * Saves one prayer's time for one date, per the given scope:
 *  - "recurring" (the default a first-time entry should use): upserts the
 *    (masjidId, prayerId, month, day) rule and sets its originDate to this
 *    exact date — becomes the default for this calendar day in every
 *    future year unless a later date-specific override exists. Never
 *    touches any OTHER date's override.
 *  - "override": upserts a (masjidId, prayerId, exact date) row only —
 *    the recurring rule, if any, is left completely untouched.
 * Always logs one MasjidPrayerTimeChangeLog row (the value that was
 * effective for this date before the change -> the new value).
 */
export async function saveEffectivePrayerTime({ masjidId, prayerId, dateStr, time, scope, actor }) {
  const { month, day } = parseDateStr(dateStr);

  const before = await getEffectivePrayerTimes(masjidId, dateStr);
  const oldValue = before.find((e) => e.prayerId === prayerId)?.time ?? null;

  if (scope === "override") {
    const [row, created] = await MasjidPrayerDateOverride.findOrCreate({
      where: { masjidId, prayerId, date: dateStr },
      defaults: { time },
    });
    if (!created && row.time !== time) {
      row.time = time;
      await row.save();
    }
  } else {
    const [row, created] = await MasjidPrayerRecurringSchedule.findOrCreate({
      where: { masjidId, prayerId, month, day },
      defaults: { time, originDate: dateStr },
    });
    if (!created && (row.time !== time || toDateStr(row.originDate) !== dateStr)) {
      row.time = time;
      row.originDate = dateStr;
      await row.save();
    }
  }

  if (oldValue !== time) {
    await MasjidPrayerTimeChangeLog.create({
      masjidId,
      prayerId,
      effectiveDate: dateStr,
      changeType: scope === "override" ? "date_override" : "recurring_rule",
      oldValue,
      newValue: time,
      actorType: actor?.type || "user",
      actorName: actor?.name || null,
    });
  }
}

/** Copies one date's effective prayer times onto another date, as overrides. Powers Copy Previous Day/Week and Copy Date -> Date. */
export async function copyPrayerTimes({ masjidId, fromDateStr, toDateStr, actor }) {
  const fromRoster = await getEffectivePrayerTimes(masjidId, fromDateStr);
  for (const entry of fromRoster) {
    if (entry.time == null) continue;
    await saveEffectivePrayerTime({
      masjidId, prayerId: entry.prayerId, dateStr: toDateStr,
      time: entry.time, scope: "override", actor,
    });
  }
  return getEffectivePrayerTimes(masjidId, toDateStr);
}

/** Applies one template date's effective prayer times as overrides across every date in an inclusive range (capped at MAX_RANGE_DAYS). */
export async function applyPrayerTimesToRange({ masjidId, templateDateStr, startDateStr, endDateStr, actor }) {
  const start = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);
  const days = Math.round((end - start) / 86400000) + 1;
  if (days < 1 || days > MAX_RANGE_DAYS) {
    throw new Error(`The date range must be between 1 and ${MAX_RANGE_DAYS} days.`);
  }

  const templateRoster = await getEffectivePrayerTimes(masjidId, templateDateStr);
  const appliedDates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    for (const entry of templateRoster) {
      if (entry.time == null) continue;
      await saveEffectivePrayerTime({
        masjidId, prayerId: entry.prayerId, dateStr,
        time: entry.time, scope: "override", actor,
      });
    }
    appliedDates.push(dateStr);
  }
  return appliedDates;
}

/** Distinct dates within a calendar month that carry at least one date-specific override — powers the Calendar View's highlighting. */
export async function listOverrideDatesInMonth(masjidId, year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const rows = await MasjidPrayerDateOverride.findAll({
    where: { masjidId, date: { [Op.between]: [start, end] } },
    attributes: ["date"],
  });
  return [...new Set(rows.map((r) => toDateStr(r.date)))];
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
