import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import { uploadResume } from "../middleware/upload.js";
import {
  listMine,
  listMyApplications,
  getOne,
  createJob,
  updateJob,
  closeJob,
  reopenJob,
  applyToJob,
  getMyApplication,
  listApplicants,
  getApplicant,
  updateApplicationStatus,
  downloadApplicantResume,
} from "../controllers/jobController.js";

const router = Router();

router.use(auth, requireUser);

router.get("/mine", listMine);
router.get("/mine/applications", listMyApplications);
router.post("/", createJob);
router.get("/:id", getOne);
router.patch("/:id", updateJob);
router.post("/:id/close", closeJob);
router.post("/:id/reopen", reopenJob);

router.post("/:id/apply", uploadResume, applyToJob);
router.get("/:id/my-application", getMyApplication);
router.get("/:id/applications", listApplicants);
router.get("/:id/applications/:appId", getApplicant);
router.patch("/:id/applications/:appId", updateApplicationStatus);
router.get("/:id/applications/:appId/resume", downloadApplicantResume);

export default router;
