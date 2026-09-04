import MaritalStatus from "../models/MaritalStatus.js";

const DEFAULTS = ["Single", "Married", "Engaged", "Divorced", "Widowed", "Separated", "Prefer not to say"];

export async function ensureMaritalStatusDefaults() {
  const count = await MaritalStatus.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => MaritalStatus.create({ name, sortOrder: i })));
}
