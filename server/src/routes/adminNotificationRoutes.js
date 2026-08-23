import { Router } from "express";
import {
  listTemplates,
  getTemplate,
  updateTemplate,
  previewTemplate,
  sendTestEmail,
  listLogs,
  getStats,
  getSettings,
  updateSettings,
} from "../controllers/adminNotificationController.js";
import auth, { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/stats", getStats);
router.get("/logs", listLogs);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

router.get("/templates", listTemplates);
router.get("/templates/:key", getTemplate);
router.put("/templates/:key", updateTemplate);
router.post("/templates/:key/preview", previewTemplate);
router.post("/templates/:key/test", sendTestEmail);

export default router;
