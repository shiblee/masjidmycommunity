import { Router } from "express";
import optionalAuth from "../middleware/optionalAuth.js";
import { visitorCookie } from "../middleware/visitorCookie.js";
import { track, heartbeat, end, getCount, stream } from "../controllers/publicVisitorController.js";

const router = Router();

// optionalAuth first so req.user is available (to record which authenticated
// user a session belongs to, when there is one) without ever requiring
// login — every route here works the same for a fully anonymous visitor.
router.post("/track", optionalAuth, visitorCookie, track);
router.post("/heartbeat", optionalAuth, visitorCookie, heartbeat);
router.post("/end", optionalAuth, visitorCookie, end);
router.get("/count", getCount);
router.get("/stream", stream);

export default router;
