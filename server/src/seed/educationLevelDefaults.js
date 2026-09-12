import EducationLevel from "../models/EducationLevel.js";

const DEFAULTS = [
  "No Formal Education",
  "Primary",
  "Middle School",
  "Secondary",
  "Senior Secondary",
  "High School Diploma",
  "Diploma",
  "Advanced Diploma",
  "Associate Degree",
  "Vocational / ITI",
  "Certificate",
  "Bachelor's",
  "Post Graduate Diploma",
  "Master's",
  "M.Phil",
  "Professional Degree",
  "Doctorate",
  "Post Doctorate",
  "Hifz-ul-Quran",
  "Alim / Aalima",
  "Fazil",
  "Kamil",
  "Madrasa Education",
  "Other",
];

export async function ensureEducationLevelDefaults() {
  const count = await EducationLevel.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => EducationLevel.create({ name, sortOrder: i })));
}
