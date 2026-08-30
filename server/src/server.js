import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import { ensureEmailDefaults } from "./seed/emailDefaults.js";
import { ensureMasjidCategoryDefaults } from "./seed/masjidCategoryDefaults.js";
import { ensureCampaignCategoryDefaults } from "./seed/campaignCategoryDefaults.js";
import { ensureCampaignClassificationDefaults } from "./seed/campaignClassificationDefaults.js";
import { ensureConcernTypeDefaults } from "./seed/concernTypeDefaults.js";
import { ensureBankDefaults } from "./seed/bankDefaults.js";
import { ensureDeletionReasonDefaults } from "./seed/deletionReasonDefaults.js";
import { ensureReportReasonDefaults } from "./seed/reportReasonDefaults.js";
import { ensureModerationSettings } from "./seed/moderationSettingsDefaults.js";
import { ensureContentSettings } from "./seed/contentSettingsDefaults.js";
import { ensureLanguageDefaults } from "./seed/languageDefaults.js";
import { ensureTranslationDefaults } from "./seed/translationDefaults.js";

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() =>
    Promise.all([
      ensureEmailDefaults(),
      ensureMasjidCategoryDefaults(),
      ensureCampaignCategoryDefaults(),
      ensureCampaignClassificationDefaults(),
      ensureConcernTypeDefaults(),
      ensureBankDefaults(),
      ensureDeletionReasonDefaults(),
      ensureReportReasonDefaults(),
      ensureModerationSettings(),
      ensureContentSettings(),
      ensureLanguageDefaults(),
      ensureTranslationDefaults(),
    ])
  )
  .catch((error) => console.error("Failed to seed defaults:", error.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
