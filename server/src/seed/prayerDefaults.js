import PrayerMaster from "../models/PrayerMaster.js";

// Seeded as a starting point covering the full 24-hour cycle a masjid's
// board typically shows, not just the 5 Fard prayers — admins can rename,
// deactivate, reorder, or add further prayers via Meta → Prayer Management
// with no code change. sortOrder is fixed here (chronological across the
// day) rather than auto-incremented, so a fresh install already reads
// top-to-bottom in the order a masjid actually observes these.
//
// Validation config (read by prayerValidationService.js): null period/
// minTime/maxTime means unrestricted for that check — Isha ships with only
// period:"PM" and no fixed range, matching "Configurable based on the
// Masjid/roster rules." requiresPreviousCheck/requiresNextCheck default
// false for Jumu'ah (shares Dhuhr's slot) and Tahajjud/Witr (day's edges) so
// they don't get forced into the main Fajr->...->Isha sequence chain.
// `relatedPrayerName` is resolved to an actual relatedPrayerId below, since
// it depends on another row's id rather than being a static value.
const DEFAULTS = [
  { name: "Tahajjud", category: "Nafl", sortOrder: 0, requiresPreviousCheck: false, requiresNextCheck: false },
  { name: "Fajr", category: "Fard", sortOrder: 1, period: "AM", minTime: "04:00", maxTime: "07:00", relatedPrayerName: "Sunrise", relation: "before", requiresPreviousCheck: false, requiresNextCheck: true },
  { name: "Sunrise", category: "Info", sortOrder: 2, period: "AM", minTime: "04:00", maxTime: "07:00", requiresPreviousCheck: true, requiresNextCheck: true },
  { name: "Dhuhr", category: "Fard", sortOrder: 3, period: "PM", minTime: "12:00", maxTime: "15:00", requiresPreviousCheck: true, requiresNextCheck: true },
  { name: "Jumu'ah", category: "Jumu'ah", sortOrder: 4, period: "PM", minTime: "12:00", maxTime: "15:00", requiresPreviousCheck: false, requiresNextCheck: false },
  { name: "Asr", category: "Fard", sortOrder: 5, period: "PM", minTime: "16:00", maxTime: "18:00", requiresPreviousCheck: true, requiresNextCheck: true },
  { name: "Maghrib", category: "Fard", sortOrder: 6, period: "PM", minTime: "17:00", maxTime: "19:30", requiresPreviousCheck: true, requiresNextCheck: true },
  { name: "Isha", category: "Fard", sortOrder: 7, period: "PM", requiresPreviousCheck: true, requiresNextCheck: false },
  { name: "Witr", category: "Witr", sortOrder: 8, requiresPreviousCheck: false, requiresNextCheck: false },
];

// Additive on every boot: creates any default name not already present
// (case-insensitive), never touches an existing row's own fields — admin
// edits (renames, deactivation, reordering, re-tuning validation config) are
// always preserved. Mirrors masjidContactDesignationDefaults.js.
export async function ensurePrayerDefaults() {
  const existing = await PrayerMaster.findAll();
  const existingNames = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  const missing = DEFAULTS.filter((p) => !existingNames.has(p.name.trim().toLowerCase()));
  if (missing.length) {
    await Promise.all(missing.map(({ relatedPrayerName, ...p }) => PrayerMaster.create(p)));
  }

  // One narrow exception to "never touch existing rows": relatedPrayerId
  // can't be a static value in DEFAULTS above (it depends on another row's
  // id, assigned at creation time), so it's resolved here — but only ever
  // backfilled while still null, never overwriting an admin's own
  // reconfiguration of this link once set.
  const needsLink = DEFAULTS.filter((p) => p.relatedPrayerName);
  if (needsLink.length) {
    const all = await PrayerMaster.findAll();
    const byName = new Map(all.map((p) => [p.name.trim().toLowerCase(), p]));
    for (const def of needsLink) {
      const row = byName.get(def.name.trim().toLowerCase());
      const related = byName.get(def.relatedPrayerName.trim().toLowerCase());
      if (row && related && row.relatedPrayerId == null) {
        row.relatedPrayerId = related.id;
        await row.save();
      }
    }
  }
}
