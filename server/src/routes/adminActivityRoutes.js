import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { recordPageView } from "../controllers/adminActivityController.js";

const router = Router();

router.post("/page-view", auth, requireAdmin, recordPageView);

export default router;
