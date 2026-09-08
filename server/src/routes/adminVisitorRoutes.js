import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSummary, listSessions, getSessionDetail, getVisitorInsights, issueStreamTicket, streamOnline, getOnline } from "../controllers/adminVisitorController.js";

const router = Router();

// Registered before the blanket auth below — EventSource can't send an
// Authorization header, so this route authenticates via its own short-lived
// ticket (see issueStreamTicket/streamOnline) instead of the normal Bearer
// middleware every other route here uses.
router.get("/stream", streamOnline);

router.use(auth, requireAdmin);

router.get("/summary", getSummary);
router.get("/insights", getVisitorInsights);
router.get("/sessions", listSessions);
router.get("/sessions/:sessionKey", getSessionDetail);
router.get("/online", getOnline);
router.post("/stream-ticket", issueStreamTicket);

export default router;
