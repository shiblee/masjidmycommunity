import CampaignCategory from "../models/CampaignCategory.js";

// Matches the category names already used by the public homepage's "Explore
// by category" section, so a campaign filed under one ties directly into
// that existing browsing UX instead of needing a separate taxonomy.
const DEFAULTS = ["Construction", "Renovation", "Education", "Solar Energy", "Water", "Digital Facilities", "Community Welfare", "Emergency Support"];

export async function ensureCampaignCategoryDefaults() {
  const count = await CampaignCategory.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => CampaignCategory.create({ name, sortOrder: i })));
}
