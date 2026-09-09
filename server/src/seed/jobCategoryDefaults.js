import JobCategory from "../models/JobCategory.js";

const DEFAULTS = [
  ["Teaching & Education", "book"],
  ["IT & Technology", "content"],
  ["Healthcare", "heart"],
  ["Administration", "fileText"],
  ["Finance", "wallet"],
  ["Marketing", "megaphone"],
  ["Sales", "trendUp"],
  ["Skilled Work", "briefcase"],
  ["Part-Time", "clock"],
  ["Remote", "globe"],
  ["Internship", "star"],
  ["Other", "layers"],
];

export async function ensureJobCategoryDefaults() {
  const count = await JobCategory.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map(([name, icon], i) => JobCategory.create({ name, icon, sortOrder: i })));
}
