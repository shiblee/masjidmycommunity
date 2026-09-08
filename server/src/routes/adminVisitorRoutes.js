import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSummary, listSessions, getSessionDetail, getVisitorInsights } from "../controllers/adminVisitorController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/summary", getSummary);
router.get("/insights", getVisitorInsights);
router.get("/sessions", listSessions);
router.get("/sessions/:sessionKey", getSessionDetail);

export default router;
