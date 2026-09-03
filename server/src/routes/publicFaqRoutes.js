import { Router } from "express";
import { list, ask, feedback } from "../controllers/publicFaqController.js";
import faqAskRateLimit from "../middleware/faqAskRateLimit.js";

const router = Router();

router.get("/", list);
router.post("/ask", faqAskRateLimit, ask);
router.patch("/ask/:logId/feedback", feedback);

export default router;
