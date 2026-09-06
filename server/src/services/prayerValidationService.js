import PrayerMaster from "../models/PrayerMaster.js";
import { getEffectivePrayerTimes } from "./prayerTimeService.js";

// Hard rules (AM/PM period, min/max range) come first and always block —
// prayer timing is structured data, not something an AI model should be
// arbitrarily judging. Everything past that (relational, sequence, and the
// anomaly check below) is a soft, confirmable warning, never a silent
// override of what the masjid actually enters.
//
// The "AI-assisted" anomaly check is deliberately NOT a real AI/LLM call —
// it's a deterministic threshold comparison against this exact prayer's own
// prior effective time for this exact date. That keeps it fast, free, and
// fully explainable, which is what structured, latency-sensitive validation
// like this calls for.
const ANOMALY_THRESHOLD_MINUTES = 45;

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function periodOf(time) {
  return toMinutes(time) < 12 * 60 ? "AM" : "PM";
}

function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Validates a batch of incoming prayer-time entries for one masjid/date.
 * Checks run against the resulting FULL day — the existing effective roster
 * with `entries`' incoming times overlaid — so e.g. saving only Fajr still
 * gets checked against whatever Sunrise is already effective on that date.
 *
 * Returns { errors: [{prayerId, message}], warnings: [{prayerId, message}] }.
 * Callers block the save on any error and require explicit confirmation
 * (a `confirmWarnings` flag) to proceed past warnings.
 */
export async function validatePrayerTimes({ masjidId, dateStr, entries }) {
  const errors = [];
  const warnings = [];

  const [effective, allPrayers] = await Promise.all([
    getEffectivePrayerTimes(masjidId, dateStr),
    PrayerMaster.findAll({ order: [["sortOrder", "ASC"]] }),
  ]);

  const prayerById = new Map(allPrayers.map((p) => [p.id, p]));
  const priorTimeByPrayerId = new Map(effective.map((e) => [e.prayerId, e.time]));

  // The merged view: incoming entries win over whatever was already
  // effective, so relational/sequence checks see the day as it will look
  // once this save completes.
  const mergedTimeByPrayerId = new Map(priorTimeByPrayerId);
  for (const entry of entries) mergedTimeByPrayerId.set(entry.prayerId, entry.time);

  // Only prayers that are part of this active, ordered set participate in
  // the sequence chain — an inactive or unknown prayer can't be a neighbor.
  const chainPrayers = allPrayers.filter((p) => p.isActive);

  // Tracks directed pairs already covered by the explicit relational check
  // (e.g. Fajr->Sunrise) so the generic sequence check below doesn't also
  // fire a near-duplicate warning for the exact same pair.
  const relationalPairsWarned = new Set();

  for (const entry of entries) {
    const prayer = prayerById.get(entry.prayerId);
    if (!prayer) continue; // format-level checks already reject unknown prayerIds before this runs
    const time = entry.time;
    const label = prayer.name;

    // a. Period (AM/PM) — hard
    if (prayer.period && periodOf(time) !== prayer.period) {
      const periodLabel = prayer.period === "AM" ? "an AM (before 12:00 PM)" : "a PM (12:00 PM or later)";
      errors.push({ prayerId: prayer.id, message: `${label} must be entered as ${periodLabel} time.` });
      continue; // range/relational checks on an already period-invalid time would just be noise
    }

    // b. Min/max range — hard
    if (prayer.minTime && toMinutes(time) < toMinutes(prayer.minTime)) {
      errors.push({ prayerId: prayer.id, message: `${label} must be between ${formatTime(prayer.minTime)} and ${formatTime(prayer.maxTime || prayer.minTime)}.` });
      continue;
    }
    if (prayer.maxTime && toMinutes(time) > toMinutes(prayer.maxTime)) {
      errors.push({ prayerId: prayer.id, message: `${label} must be between ${formatTime(prayer.minTime || prayer.maxTime)} and ${formatTime(prayer.maxTime)}.` });
      continue;
    }

    // c. Relational check (e.g. Fajr before Sunrise) — warning
    if (prayer.relatedPrayerId && prayer.relation) {
      const relatedTime = mergedTimeByPrayerId.get(prayer.relatedPrayerId);
      const related = prayerById.get(prayer.relatedPrayerId);
      if (relatedTime && related) {
        const violates = prayer.relation === "before"
          ? toMinutes(time) >= toMinutes(relatedTime)
          : toMinutes(time) <= toMinutes(relatedTime);
        if (violates) {
          relationalPairsWarned.add(`${prayer.id}:${related.id}`);
          warnings.push({
            prayerId: prayer.id,
            message: `The selected ${label} time (${formatTime(time)}) is ${prayer.relation === "before" ? "later" : "earlier"} than the configured ${related.name} time (${formatTime(relatedTime)}). Please verify before saving.`,
          });
        }
      }
    }

    // d. Chronological sequence — warning. Compares against the nearest
    // chain-neighbor (by sortOrder) that also has a time set, in either
    // direction this prayer is configured to check.
    if (prayer.requiresPreviousCheck) {
      const prevNeighbor = [...chainPrayers].reverse().find((p) => p.requiresNextCheck && p.sortOrder < prayer.sortOrder && mergedTimeByPrayerId.get(p.id));
      if (prevNeighbor && !relationalPairsWarned.has(`${prayer.id}:${prevNeighbor.id}`)) {
        const prevTime = mergedTimeByPrayerId.get(prevNeighbor.id);
        if (toMinutes(time) <= toMinutes(prevTime)) {
          warnings.push({ prayerId: prayer.id, message: `${label} (${formatTime(time)}) is expected to be after ${prevNeighbor.name} (${formatTime(prevTime)}). Please verify before saving.` });
        }
      }
    }
    if (prayer.requiresNextCheck) {
      const nextNeighbor = chainPrayers.find((p) => p.requiresPreviousCheck && p.sortOrder > prayer.sortOrder && mergedTimeByPrayerId.get(p.id));
      if (nextNeighbor && !relationalPairsWarned.has(`${prayer.id}:${nextNeighbor.id}`)) {
        const nextTime = mergedTimeByPrayerId.get(nextNeighbor.id);
        if (toMinutes(time) >= toMinutes(nextTime)) {
          warnings.push({ prayerId: prayer.id, message: `${label} (${formatTime(time)}) is expected to be before ${nextNeighbor.name} (${formatTime(nextTime)}). Please verify before saving.` });
        }
      }
    }

    // e. Heuristic anomaly — warning. Deterministic threshold, not a real
    // AI call: flags a large jump from this exact date's own prior value.
    if (prayer.aiAnomalyCheck) {
      const priorTime = priorTimeByPrayerId.get(prayer.id);
      if (priorTime && priorTime !== time) {
        const delta = Math.abs(toMinutes(time) - toMinutes(priorTime));
        if (delta > ANOMALY_THRESHOLD_MINUTES) {
          warnings.push({
            prayerId: prayer.id,
            message: `This timing (${formatTime(time)}) differs by more than ${ANOMALY_THRESHOLD_MINUTES} minutes from the previously saved ${label} time (${formatTime(priorTime)}) for this date. Please verify before saving.`,
          });
        }
      }
    }
  }

  return { errors, warnings };
}
