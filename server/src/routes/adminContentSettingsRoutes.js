import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSettings, updateSettings } from "../controllers/adminContentSettingsController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", getSettings);
router.patch("/", updateSettings);

export default router;
