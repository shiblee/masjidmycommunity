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
import adminMaritalStatusRoutes from "./routes/adminMaritalStatusRoutes.js";
import adminEducationLevelRoutes from "./routes/adminEducationLevelRoutes.js";
import adminDegreeRoutes from "./routes/adminDegreeRoutes.js";
import adminInstitutionRoutes from "./routes/adminInstitutionRoutes.js";
import adminFieldOfStudyRoutes from "./routes/adminFieldOfStudyRoutes.js";
import adminCompanyRoutes from "./routes/adminCompanyRoutes.js";
import adminEmploymentTypeRoutes from "./routes/adminEmploymentTypeRoutes.js";
import adminMetaChangeLogRoutes from "./routes/adminMetaChangeLogRoutes.js";
import adminModerationRoutes from "./routes/adminModerationRoutes.js";
import publicReportRoutes from "./routes/publicReportRoutes.js";
import adminContentSettingsRoutes from "./routes/adminContentSettingsRoutes.js";
import adminAuthSettingsRoutes from "./routes/adminAuthSettingsRoutes.js";
import adminLanguageRoutes from "./routes/adminLanguageRoutes.js";
import adminTranslationRoutes from "./routes/adminTranslationRoutes.js";
import publicI18nRoutes from "./routes/publicI18nRoutes.js";
import adminPageRoutes from "./routes/adminPageRoutes.js";
import publicPageRoutes from "./routes/publicPageRoutes.js";
import adminAlertRoutes from "./routes/adminAlertRoutes.js";
import adminContactRoutes from "./routes/adminContactRoutes.js";
import adminContactTopicRoutes from "./routes/adminContactTopicRoutes.js";
import publicFaqRoutes from "./routes/publicFaqRoutes.js";
import adminFaqRoutes from "./routes/adminFaqRoutes.js";
import adminAiQueryLogRoutes from "./routes/adminAiQueryLogRoutes.js";
import publicTestimonialRoutes from "./routes/publicTestimonialRoutes.js";
import adminTestimonialRoutes from "./routes/adminTestimonialRoutes.js";
import publicSuccessStoryRoutes from "./routes/publicSuccessStoryRoutes.js";
import adminSuccessStoryRoutes from "./routes/adminSuccessStoryRoutes.js";
import publicSitemapRoutes from "./routes/publicSitemapRoutes.js";
import publicUserRoutes from "./routes/publicUserRoutes.js";

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

// Mounted at the domain root (not under /api) because the sitemap protocol
// only allows a sitemap to list URLs within its own path — a sitemap served
// from /api/sitemap.xml could never list "/how-it-works" etc. In production,
// where Nginx serves the built SPA and only proxies /api and /uploads to
// this server, add one more proxy rule for /sitemap.xml so it reaches here
// instead of falling through to the SPA.
app.use("/sitemap.xml", publicSitemapRoutes);

app.use("/api/users/public", publicUserRoutes);
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
app.use("/api/admin/marital-statuses", adminMaritalStatusRoutes);
app.use("/api/admin/education-levels", adminEducationLevelRoutes);
app.use("/api/admin/degrees", adminDegreeRoutes);
app.use("/api/admin/institutions", adminInstitutionRoutes);
app.use("/api/admin/fields-of-study", adminFieldOfStudyRoutes);
app.use("/api/admin/companies", adminCompanyRoutes);
app.use("/api/admin/employment-types", adminEmploymentTypeRoutes);
app.use("/api/admin/meta-change-log", adminMetaChangeLogRoutes);
app.use("/api/admin/moderation", adminModerationRoutes);
app.use("/api/reports", publicReportRoutes);
app.use("/api/admin/content-settings", adminContentSettingsRoutes);
app.use("/api/admin/auth-settings", adminAuthSettingsRoutes);
app.use("/api/admin/languages", adminLanguageRoutes);
app.use("/api/admin/translations", adminTranslationRoutes);
app.use("/api/i18n", publicI18nRoutes);
app.use("/api/admin/pages", adminPageRoutes);
app.use("/api/pages", publicPageRoutes);
app.use("/api/admin/alerts", adminAlertRoutes);
app.use("/api/admin/contact-inquiries", adminContactRoutes);
app.use("/api/admin/contact-topics", adminContactTopicRoutes);
app.use("/api/faq", publicFaqRoutes);
app.use("/api/admin/faqs", adminFaqRoutes);
app.use("/api/admin/ai-query-logs", adminAiQueryLogRoutes);
app.use("/api/testimonials", publicTestimonialRoutes);
app.use("/api/admin/testimonials", adminTestimonialRoutes);
app.use("/api/success-stories", publicSuccessStoryRoutes);
app.use("/api/admin/success-stories", adminSuccessStoryRoutes);

export default app;
