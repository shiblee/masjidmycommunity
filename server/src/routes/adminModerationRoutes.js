import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requireModuleAccess } from "../middleware/permission.js";
import { getSettings, updateSettings, listReportedContent, getContentDetail, takeAction } from "../controllers/adminModerationController.js";

const router = Router();

router.use(auth, requireAdmin, requireModuleAccess("moderation"));

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);
router.get("/content", listReportedContent);
router.get("/content/:targetType/:targetId", getContentDetail);
router.post("/content/:targetType/:targetId/action", takeAction);

export default router;
