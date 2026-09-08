import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSettings, updateSettings, testRunBot, getStatus, listBotUsers, resetBotData } from "../controllers/adminUserBotController.js";

const router = Router();
router.use(auth, requireAdmin);

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);
router.post("/test-run", testRunBot);
router.get("/status", getStatus);
router.get("/users", listBotUsers);
router.delete("/data", resetBotData);

export default router;
