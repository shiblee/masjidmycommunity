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

const app = express();

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

export default app;
