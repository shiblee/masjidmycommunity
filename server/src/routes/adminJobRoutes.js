import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requireModuleAccess } from "../middleware/permission.js";
import {
  listAll,
  getOne,
  create,
  update,
  updateStatus,
  updateModeration,
  hardDelete,
  listApplications,
  updateApplicationStatus,
  downloadApplicantResume,
} from "../controllers/adminJobController.js";

const router = Router();

router.use(auth, requireAdmin, requireModuleAccess("jobs"));

router.get("/", listAll);
router.post("/", create);
router.get("/:id", getOne);
router.patch("/:id", update);
router.patch("/:id/status", updateStatus);
router.patch("/:id/moderation", updateModeration);
router.delete("/:id", hardDelete);

router.get("/:id/applications", listApplications);
router.patch("/:id/applications/:appId", updateApplicationStatus);
router.get("/:id/applications/:appId/resume", downloadApplicantResume);

export default router;
