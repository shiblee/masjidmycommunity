import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { runHealthCheck, listHealthCheckRuns } from "../controllers/adminHealthController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/runs", requirePermission("developer", "view"), listHealthCheckRuns);
router.post("/run", requirePermission("developer", "edit"), runHealthCheck);

export default router;
