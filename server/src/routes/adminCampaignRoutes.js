import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import {
  listAll,
  getOne,
  approve,
  reject,
  requestChanges,
  addNote,
  pause,
  resume,
  markCompleted,
  cancel,
  recordDonation,
  downloadDocument,
} from "../controllers/adminCampaignController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listAll);
router.get("/:id", getOne);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
router.post("/:id/request-changes", requestChanges);
router.post("/:id/notes", addNote);
router.post("/:id/pause", pause);
router.post("/:id/resume", resume);
router.post("/:id/complete", markCompleted);
router.post("/:id/cancel", cancel);
router.post("/:id/donations", recordDonation);
router.get("/:id/documents/:docId/file", downloadDocument);

export default router;
