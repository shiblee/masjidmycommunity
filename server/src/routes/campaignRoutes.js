import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import { uploadCampaignPhotos, uploadCampaignDocuments } from "../middleware/upload.js";
import {
  listMine,
  getOne,
  createDraft,
  update,
  upsertBudgetItems,
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  uploadDocuments,
  deleteDocument,
  downloadDocument,
  submit,
} from "../controllers/campaignController.js";

const router = Router();

router.use(auth, requireUser);

router.get("/mine", listMine);
router.post("/", createDraft);
router.get("/:id", getOne);
router.patch("/:id", update);
router.put("/:id/budget-items", upsertBudgetItems);
router.post("/:id/photos", uploadCampaignPhotos, uploadPhotos);
router.patch("/:id/photos/:photoId", updatePhoto);
router.delete("/:id/photos/:photoId", deletePhoto);
router.post("/:id/documents", uploadCampaignDocuments, uploadDocuments);
router.get("/:id/documents/:docId/file", downloadDocument);
router.delete("/:id/documents/:docId", deleteDocument);
router.post("/:id/submit", submit);

export default router;
