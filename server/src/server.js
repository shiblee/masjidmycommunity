import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import { ensureEmailDefaults } from "./seed/emailDefaults.js";
import { ensureMasjidCategoryDefaults } from "./seed/masjidCategoryDefaults.js";
import { ensureMaritalStatusDefaults } from "./seed/maritalStatusDefaults.js";
import { ensureEducationLevelDefaults } from "./seed/educationLevelDefaults.js";
import { ensureDegreeDefaults } from "./seed/degreeDefaults.js";
import { ensureInstitutionDefaults } from "./seed/institutionDefaults.js";
import { ensureFieldOfStudyDefaults } from "./seed/fieldOfStudyDefaults.js";
import { ensureCompanyDefaults } from "./seed/companyDefaults.js";
import { ensureEmploymentTypeDefaults } from "./seed/employmentTypeDefaults.js";
import { ensureHobbyDefaults } from "./seed/hobbyDefaults.js";
import { ensureSkillDefaults } from "./seed/skillDefaults.js";
import { ensureCampaignCategoryDefaults } from "./seed/campaignCategoryDefaults.js";
import { ensureCampaignClassificationDefaults } from "./seed/campaignClassificationDefaults.js";
import { ensureConcernTypeDefaults } from "./seed/concernTypeDefaults.js";
import { ensureContactTopicDefaults } from "./seed/contactTopicDefaults.js";
import { ensureFaqDefaults } from "./seed/faqDefaults.js";
import { ensureBankDefaults } from "./seed/bankDefaults.js";
import { ensureDeletionReasonDefaults } from "./seed/deletionReasonDefaults.js";
import { ensureReportReasonDefaults } from "./seed/reportReasonDefaults.js";
import { ensureModerationSettings } from "./seed/moderationSettingsDefaults.js";
import { ensureContentSettings } from "./seed/contentSettingsDefaults.js";
import { ensureAuthSettings } from "./seed/authSettingsDefaults.js";
import { ensureLanguageDefaults } from "./seed/languageDefaults.js";
import { ensureTranslationDefaults } from "./seed/translationDefaults.js";
import { ensurePageDefaults } from "./seed/pageDefaults.js";
import { ensureMetaEntityTranslationDefaults } from "./seed/metaEntityTranslationDefaults.js";

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() =>
    Promise.all([
      ensureEmailDefaults(),
      ensureMasjidCategoryDefaults(),
      ensureMaritalStatusDefaults(),
      ensureEducationLevelDefaults(),
      ensureDegreeDefaults(),
      ensureInstitutionDefaults(),
      ensureFieldOfStudyDefaults(),
      ensureCompanyDefaults(),
      ensureEmploymentTypeDefaults(),
      ensureHobbyDefaults(),
      ensureSkillDefaults(),
      ensureCampaignCategoryDefaults(),
      ensureCampaignClassificationDefaults(),
      ensureConcernTypeDefaults(),
      ensureContactTopicDefaults(),
      ensureFaqDefaults(),
      ensureBankDefaults(),
      ensureDeletionReasonDefaults(),
      ensureReportReasonDefaults(),
      ensureModerationSettings(),
      ensureContentSettings(),
      ensureAuthSettings(),
      ensureLanguageDefaults(),
      ensureTranslationDefaults(),
    ])
  )
  .then(() => ensurePageDefaults())
  .then(() => ensureMetaEntityTranslationDefaults())
  .catch((error) => console.error("Failed to seed defaults:", error.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
