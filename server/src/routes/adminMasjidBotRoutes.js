import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSettings, updateSettings, checkDuplicate, testSearch } from "../controllers/adminMasjidBotController.js";

const router = Router();
router.use(auth, requireAdmin);

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);
router.post("/check-duplicate", checkDuplicate);
router.post("/test-search", testSearch);

export default router;
