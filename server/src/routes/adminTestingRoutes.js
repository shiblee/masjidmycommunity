import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { runTests, listTestRuns } from "../controllers/adminTestingController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/runs", requirePermission("developer", "view"), listTestRuns);
router.post("/run", requirePermission("developer", "edit"), runTests);

export default router;
