import ExperienceLevel from "../models/ExperienceLevel.js";

const DEFAULTS = [
  "Fresher / No Experience",
  "0-1 years",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
];

export async function ensureExperienceLevelDefaults() {
  const count = await ExperienceLevel.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => ExperienceLevel.create({ name, sortOrder: i })));
}
