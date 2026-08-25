import MasjidCategory from "../models/MasjidCategory.js";

const DEFAULTS = ["Neighborhood Masjid", "Jami Masjid", "Community Center", "Islamic Center", "Musalla", "Other"];

export async function ensureMasjidCategoryDefaults() {
  const count = await MasjidCategory.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => MasjidCategory.create({ name, sortOrder: i })));
}
