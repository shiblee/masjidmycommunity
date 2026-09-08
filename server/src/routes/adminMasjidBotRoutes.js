import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSettings, updateSettings } from "../controllers/adminMasjidBotController.js";

const router = Router();
router.use(auth, requireAdmin);

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);

export default router;
