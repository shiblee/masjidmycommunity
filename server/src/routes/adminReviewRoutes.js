import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { listPending, actOnReview } from "../controllers/adminReviewController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/pending", listPending);
router.post("/:id/action", actOnReview);

export default router;
