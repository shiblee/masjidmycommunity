// Centralizes every default prayer-timing rule prayerCalculationEngine.js
// applies, so a future per-region/per-masjid override (different
// methodology, manual Jumu'ah slot config, etc. — explicitly out of scope
// today) has exactly one place to plug into, instead of magic numbers
// scattered through the engine itself.

// Fajr calculation method — Karachi convention (University of Islamic
// Sciences, Karachi), 18° angle. Maps directly to adhan's
// CalculationMethod.Karachi() preset. Chosen because the current masjid
// base skews India/South Asia, where this is the standard convention.
export const CALCULATION_METHOD_KEY = "Karachi";

// Maghrib = sunset exactly (0-minute offset) — matches adhan's own
// `maghrib` output (sunset) directly, no adjustment applied.
export const MAGHRIB_OFFSET_MINUTES = 0;

// Prayers with a fixed daily clock time rather than an astronomical
// calculation. Written as a SINGLE forward-filling timeline row, only if
// currently ungoverned — never touched again unless a human (or a future
// config change) overrides it. Keys matched case-insensitively against
// PrayerMaster.name, same convention ensurePrayerDefaults() already uses.
export const FIXED_PRAYER_DEFAULTS = {
  "Dhuhr": "13:00",
  "Jumu'ah": "13:30",
  "Asr": "16:30",
  "Isha": "20:30",
};

// Prayers computed daily via astronomical calc, mapped to the adhan
// PrayerTimes field each one reads from.
export const CALCULATED_PRAYER_FIELD_MAP = {
  "Fajr": "fajr",
  "Sunrise": "sunrise",
  "Maghrib": "maghrib",
};

// Rolling forward window every engine run tops up: [today, today + N days].
export const ROLLING_WINDOW_DAYS = 365;
