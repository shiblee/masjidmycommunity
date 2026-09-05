import MasjidContactDesignation from "../models/MasjidContactDesignation.js";

// Only the three mandatory office-bearers are seeded — admins add any
// further (optional) designations themselves via Meta.
const DEFAULTS = [
  { name: "Imam", isRequired: true },
  { name: "Mutawalli", isRequired: true },
  { name: "Secretary", isRequired: true },
];

// Additive on every boot: creates any default name not already present
// (case-insensitive), never touches an existing row — so admin edits
// (renames, deactivation, reordering, un-marking as required) are always
// preserved. Mirrors masjidCategoryDefaults.js.
export async function ensureMasjidContactDesignationDefaults() {
  const existing = await MasjidContactDesignation.findAll({ attributes: ["name", "sortOrder"] });
  const existingNames = new Set(existing.map((d) => d.name.trim().toLowerCase()));
  const missing = DEFAULTS.filter((d) => !existingNames.has(d.name.trim().toLowerCase()));
  if (!missing.length) return;
  let nextSort = existing.reduce((max, d) => Math.max(max, d.sortOrder ?? 0), -1) + 1;
  await Promise.all(missing.map((d) => MasjidContactDesignation.create({ ...d, sortOrder: nextSort++ })));
}
