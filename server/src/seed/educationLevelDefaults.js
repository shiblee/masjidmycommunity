import EducationLevel from "../models/EducationLevel.js";

const DEFAULTS = ["Primary", "Secondary", "Senior Secondary", "Diploma", "Post Graduate Diploma", "Bachelor's", "Master's", "Professional Degree", "Doctorate", "Vocational / ITI", "Certificate", "Other"];

export async function ensureEducationLevelDefaults() {
  const count = await EducationLevel.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => EducationLevel.create({ name, sortOrder: i })));
}
