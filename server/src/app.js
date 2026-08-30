import express from "express";
import cors from "cors";
import path from "path";
import userRoutes from "./routes/userRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminNotificationRoutes from "./routes/adminNotificationRoutes.js";
import masjidRoutes from "./routes/masjidRoutes.js";
import adminMasjidRoutes from "./routes/adminMasjidRoutes.js";
import publicMasjidRoutes from "./routes/publicMasjidRoutes.js";
import adminCommunityRoutes from "./routes/adminCommunityRoutes.js";
import publicCommunityRoutes from "./routes/publicCommunityRoutes.js";
import adminMasjidCategoryRoutes from "./routes/adminMasjidCategoryRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import adminCampaignRoutes from "./routes/adminCampaignRoutes.js";
import publicCampaignRoutes from "./routes/publicCampaignRoutes.js";
import adminCampaignCategoryRoutes from "./routes/adminCampaignCategoryRoutes.js";
import adminCampaignClassificationRoutes from "./routes/adminCampaignClassificationRoutes.js";
import publicConcernRoutes from "./routes/publicConcernRoutes.js";
import adminConcernRoutes from "./routes/adminConcernRoutes.js";
import adminConcernTypeRoutes from "./routes/adminConcernTypeRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import adminBankRoutes from "./routes/adminBankRoutes.js";
import adminDeletionReasonRoutes from "./routes/adminDeletionReasonRoutes.js";
import adminReportReasonRoutes from "./routes/adminReportReasonRoutes.js";
import adminSkillRoutes from "./routes/adminSkillRoutes.js";
import adminHobbyRoutes from "./routes/adminHobbyRoutes.js";
import adminModerationRoutes from "./routes/adminModerationRoutes.js";
import publicReportRoutes from "./routes/publicReportRoutes.js";
import adminContentSettingsRoutes from "./routes/adminContentSettingsRoutes.js";
import adminLanguageRoutes from "./routes/adminLanguageRoutes.js";
import adminTranslationRoutes from "./routes/adminTranslationRoutes.js";
import publicI18nRoutes from "./routes/publicI18nRoutes.js";

const app = express();

// Controls whether Express trusts X-Forwarded-For (and req.ip) from the
// immediate connecting peer. Left unset (false) by default so a request's
// own headers can never spoof its client IP — only turn this on, via the
// TRUST_PROXY env var, once this server actually sits behind a known
// reverse proxy/load balancer that overwrites/appends that header itself.
// Accepts: "true"/"false", a hop count ("1"), or a comma-separated list of
// trusted proxy IPs/CIDRs/keywords (Express's own trust-proxy formats).
function parseTrustProxy(value) {
  if (!value) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/", (req, res) => {
  res.json({ message: "Coming soon" });
});

app.use("/api/users", userRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/masjids/public", publicMasjidRoutes);
app.use("/api/masjids", masjidRoutes);
app.use("/api/admin/masjids", adminMasjidRoutes);
app.use("/api/admin/community", adminCommunityRoutes);
app.use("/api/admin/masjid-categories", adminMasjidCategoryRoutes);
app.use("/api/community", publicCommunityRoutes);
app.use("/api/campaigns/public", publicCampaignRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/admin/campaigns", adminCampaignRoutes);
app.use("/api/admin/campaign-categories", adminCampaignCategoryRoutes);
app.use("/api/admin/campaign-classifications", adminCampaignClassificationRoutes);
app.use("/api/concerns/public", publicConcernRoutes);
app.use("/api/admin/concerns", adminConcernRoutes);
app.use("/api/admin/concern-types", adminConcernTypeRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin/banks", adminBankRoutes);
app.use("/api/admin/deletion-reasons", adminDeletionReasonRoutes);
app.use("/api/admin/report-reasons", adminReportReasonRoutes);
app.use("/api/admin/skills", adminSkillRoutes);
app.use("/api/admin/hobbies", adminHobbyRoutes);
app.use("/api/admin/moderation", adminModerationRoutes);
app.use("/api/reports", publicReportRoutes);
app.use("/api/admin/content-settings", adminContentSettingsRoutes);
app.use("/api/admin/languages", adminLanguageRoutes);
app.use("/api/admin/translations", adminTranslationRoutes);
app.use("/api/i18n", publicI18nRoutes);

export default app;
