import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import { ensureEmailDefaults } from "./seed/emailDefaults.js";
import { ensureMasjidCategoryDefaults } from "./seed/masjidCategoryDefaults.js";
import { ensureCampaignCategoryDefaults } from "./seed/campaignCategoryDefaults.js";

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => Promise.all([ensureEmailDefaults(), ensureMasjidCategoryDefaults(), ensureCampaignCategoryDefaults()]))
  .catch((error) => console.error("Failed to seed defaults:", error.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
