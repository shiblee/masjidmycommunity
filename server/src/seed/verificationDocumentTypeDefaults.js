import VerificationDocumentType from "../models/VerificationDocumentType.js";

// A starting catalogue covering the document categories named in the Green
// Tick spec — admins can rename, deactivate, reorder, or add further types
// (per category) via Meta with no code change.
const DEFAULTS = [
  { name: "Government Photo ID", category: "representative", isRequired: true, sortOrder: 0 },
  { name: "Masjid Registration Certificate", category: "masjid", isRequired: true, sortOrder: 1 },
  { name: "Trust/Waqf/Committee Document", category: "masjid", isRequired: false, sortOrder: 2 },
  { name: "Authorization Letter", category: "masjid", isRequired: false, sortOrder: 3 },
  { name: "Government/Local Authority Document", category: "masjid", isRequired: false, sortOrder: 4 },
  { name: "Property/Land Ownership Document", category: "property", isRequired: true, sortOrder: 5 },
];

// Additive on every boot: creates any default name not already present
// (case-insensitive), never touches an existing row — admin edits are
// always preserved. Mirrors masjidContactDesignationDefaults.js.
export async function ensureVerificationDocumentTypeDefaults() {
  const existing = await VerificationDocumentType.findAll({ attributes: ["name"] });
  const existingNames = new Set(existing.map((d) => d.name.trim().toLowerCase()));
  const missing = DEFAULTS.filter((d) => !existingNames.has(d.name.trim().toLowerCase()));
  if (!missing.length) return;
  await Promise.all(missing.map((d) => VerificationDocumentType.create(d)));
}
