import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { uploadCampaignPhotos, uploadCampaignDocuments } from "../middleware/upload.js";
import {
  listAll,
  create,
  getOne,
  updateFields,
  approve,
  reject,
  requestChanges,
  addNote,
  pause,
  resume,
  markCompleted,
  cancel,
  recordDonation,
  confirmDonation,
  declineDonation,
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  uploadDocuments,
  deleteDocument,
  downloadDocument,
  remove,
} from "../controllers/adminCampaignController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listAll);
router.post("/", create);
router.get("/:id", getOne);
router.patch("/:id", updateFields);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
router.post("/:id/request-changes", requestChanges);
router.post("/:id/notes", addNote);
router.post("/:id/pause", pause);
router.post("/:id/resume", resume);
router.post("/:id/complete", markCompleted);
router.post("/:id/cancel", cancel);
router.post("/:id/donations", recordDonation);
router.post("/:id/donations/:donationId/confirm", confirmDonation);
router.post("/:id/donations/:donationId/decline", declineDonation);
router.post("/:id/photos", uploadCampaignPhotos, uploadPhotos);
router.patch("/:id/photos/:photoId", updatePhoto);
router.delete("/:id/photos/:photoId", deletePhoto);
router.post("/:id/documents", uploadCampaignDocuments, uploadDocuments);
router.get("/:id/documents/:docId/file", downloadDocument);
router.delete("/:id/documents/:docId", deleteDocument);
router.post("/:id/delete", remove);

export default router;
