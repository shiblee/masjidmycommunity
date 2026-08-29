import CampaignClassification from "../models/CampaignClassification.js";
import Campaign from "../models/Campaign.js";

const DEFAULTS = ["General Sadaqah", "Zakat", "Waqf", "Other"];

// Campaign.donationType used to be a fixed lowercase ENUM ("general_sadaqah",
// "zakat", "waqf", "other") before this master list existed. Once the column
// becomes a free-text field holding a classification's name, old rows need
// their value rewritten to match — safe to run on every startup since it's a
// no-op once the legacy values no longer exist to match.
const LEGACY_MAP = { general_sadaqah: "General Sadaqah", zakat: "Zakat", waqf: "Waqf", other: "Other" };

export async function ensureCampaignClassificationDefaults() {
  const count = await CampaignClassification.count();
  if (count === 0) {
    await Promise.all(DEFAULTS.map((name, i) => CampaignClassification.create({ name, sortOrder: i })));
  }

  for (const [oldValue, newValue] of Object.entries(LEGACY_MAP)) {
    await Campaign.update({ donationType: newValue }, { where: { donationType: oldValue } });
  }
}
