import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import {
  listAll,
  getOne,
  create,
  update,
  updateStatus,
  updateModeration,
  listApplications,
  updateApplicationStatus,
  downloadApplicantResume,
} from "../controllers/adminJobController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listAll);
router.post("/", create);
router.get("/:id", getOne);
router.patch("/:id", update);
router.patch("/:id/status", updateStatus);
router.patch("/:id/moderation", updateModeration);

router.get("/:id/applications", listApplications);
router.patch("/:id/applications/:appId", updateApplicationStatus);
router.get("/:id/applications/:appId/resume", downloadApplicantResume);

export default router;
