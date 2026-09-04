import EmploymentType from "../models/EmploymentType.js";

const DEFAULTS = [
  "Full-time",
  "Part-time",
  "Internship",
  "Apprenticeship",
  "Contract",
  "Freelance",
  "Self-employed",
  "Consultant",
  "Volunteer",
  "Other",
];

export async function ensureEmploymentTypeDefaults() {
  const count = await EmploymentType.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => EmploymentType.create({ name, sortOrder: i })));
}
