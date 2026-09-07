import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSummary, listSessions, getSessionDetail } from "../controllers/adminVisitorController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/summary", getSummary);
router.get("/sessions", listSessions);
router.get("/sessions/:sessionKey", getSessionDetail);

export default router;
