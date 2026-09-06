import PrayerMaster from "../models/PrayerMaster.js";

// Seeded as a starting point covering the full 24-hour cycle a masjid's
// board typically shows, not just the 5 Fard prayers — admins can rename,
// deactivate, reorder, or add further prayers via Meta → Prayer Management
// with no code change. sortOrder is fixed here (chronological across the
// day) rather than auto-incremented, so a fresh install already reads
// top-to-bottom in the order a masjid actually observes these.
const DEFAULTS = [
  { name: "Tahajjud", category: "Nafl", sortOrder: 0 },
  { name: "Fajr", category: "Fard", sortOrder: 1 },
  { name: "Sunrise", category: "Info", sortOrder: 2 },
  { name: "Dhuhr", category: "Fard", sortOrder: 3 },
  { name: "Jumu'ah", category: "Jumu'ah", sortOrder: 4 },
  { name: "Asr", category: "Fard", sortOrder: 5 },
  { name: "Maghrib", category: "Fard", sortOrder: 6 },
  { name: "Isha", category: "Fard", sortOrder: 7 },
  { name: "Witr", category: "Witr", sortOrder: 8 },
];

// Additive on every boot: creates any default name not already present
// (case-insensitive), never touches an existing row — admin edits (renames,
// deactivation, reordering) are always preserved. Mirrors
// masjidContactDesignationDefaults.js.
export async function ensurePrayerDefaults() {
  const existing = await PrayerMaster.findAll({ attributes: ["name", "sortOrder"] });
  const existingNames = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  const missing = DEFAULTS.filter((p) => !existingNames.has(p.name.trim().toLowerCase()));
  if (!missing.length) return;
  await Promise.all(missing.map((p) => PrayerMaster.create(p)));
}
