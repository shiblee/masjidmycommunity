import MasjidContactDesignation from "../models/MasjidContactDesignation.js";

// Imam/Mutawalli/Secretary are the three mandatory office-bearers; the rest
// are common masjid committee/administrative roles seeded as optional
// starting points — admins can add, rename, deactivate, or mark any of them
// mandatory via Meta.
const DEFAULTS = [
  { name: "Imam", isRequired: true },
  { name: "Mutawalli", isRequired: true },
  { name: "Secretary", isRequired: true },
  { name: "President", isRequired: false },
  { name: "Vice President", isRequired: false },
  { name: "Joint Secretary", isRequired: false },
  { name: "Treasurer", isRequired: false },
  { name: "Joint Treasurer", isRequired: false },
  { name: "Trustee", isRequired: false },
  { name: "Committee Member", isRequired: false },
  { name: "Auditor", isRequired: false },
  { name: "Legal Advisor", isRequired: false },
  { name: "Naib Imam", isRequired: false },
  { name: "Khatib", isRequired: false },
  { name: "Muezzin", isRequired: false },
  { name: "Qari", isRequired: false },
  { name: "Hafiz", isRequired: false },
  { name: "Madrasa In-charge", isRequired: false },
  { name: "Madrasa Teacher", isRequired: false },
  { name: "Caretaker", isRequired: false },
  { name: "Chowkidar", isRequired: false },
  { name: "Women's Wing Coordinator", isRequired: false },
  { name: "Youth Wing Coordinator", isRequired: false },
  { name: "Public Relations Officer", isRequired: false },
  { name: "Event Coordinator", isRequired: false },
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
