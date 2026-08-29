import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import { listReportReasons, createReport } from "../controllers/publicReportController.js";

const router = Router();

router.get("/reasons", listReportReasons);
router.post("/", auth, requireUser, createReport);

export default router;
