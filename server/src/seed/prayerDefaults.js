import PrayerMaster from "../models/PrayerMaster.js";

// The five daily prayers, seeded as a starting point — admins can rename,
// deactivate, reorder, or add further prayers (e.g. Jumu'ah) via
// Meta → Prayer Management with no code change.
const DEFAULTS = [
  { name: "Fajr", category: "Fard" },
  { name: "Dhuhr", category: "Fard" },
  { name: "Asr", category: "Fard" },
  { name: "Maghrib", category: "Fard" },
  { name: "Isha", category: "Fard" },
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
  let nextSort = existing.reduce((max, p) => Math.max(max, p.sortOrder ?? 0), -1) + 1;
  await Promise.all(missing.map((p) => PrayerMaster.create({ ...p, sortOrder: nextSort++ })));
}
