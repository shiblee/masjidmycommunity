import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSettings, updateSettings, listReportedContent, getContentDetail, takeAction } from "../controllers/adminModerationController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);
router.get("/content", listReportedContent);
router.get("/content/:targetType/:targetId", getContentDetail);
router.post("/content/:targetType/:targetId/action", takeAction);

export default router;
