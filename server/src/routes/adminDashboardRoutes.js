import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getStats } from "../controllers/adminDashboardController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/stats", getStats);

export default router;
