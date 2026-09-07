import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { listApplications } from "../controllers/adminGreenTickController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listApplications);

export default router;
