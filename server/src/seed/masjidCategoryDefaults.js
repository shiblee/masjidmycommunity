import MasjidCategory from "../models/MasjidCategory.js";

const DEFAULTS = [
  "Neighborhood Masjid", "Jami Masjid", "Community Center", "Islamic Center", "Musalla",
  "Central Masjid", "Community Masjid", "Grand Masjid", "Friday / Jumu'ah Masjid",
  "Eidgah / Eid Prayer Centre", "Educational / Institutional Masjid", "University / College Masjid",
  "School Masjid", "Workplace / Corporate Masjid", "Hospital Masjid", "Airport Masjid",
  "Railway Station Masjid", "Highway / Travel Masjid", "Residential / Colony Masjid",
  "Village Masjid", "Rural Masjid", "Urban Masjid", "Historic Masjid", "Heritage Masjid",
  "Shrine / Complex-associated Masjid", "Women's Prayer Centre", "Community / Charity Masjid",
  "Madrasa-associated Masjid", "Islamic Centre-associated Masjid", "Other",
];

// Additive on every boot: creates any default name not already present
// (case-insensitive), never touches an existing row — so admin edits
// (renames, deactivation, reordering) are always preserved.
export async function ensureMasjidCategoryDefaults() {
  const existing = await MasjidCategory.findAll({ attributes: ["name", "sortOrder"] });
  const existingNames = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  const missing = DEFAULTS.filter((name) => !existingNames.has(name.trim().toLowerCase()));
  if (!missing.length) return;
  let nextSort = existing.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), -1) + 1;
  await Promise.all(missing.map((name) => MasjidCategory.create({ name, sortOrder: nextSort++ })));
}
