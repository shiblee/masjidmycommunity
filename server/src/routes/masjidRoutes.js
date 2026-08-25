import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import { uploadMasjidPhotos } from "../middleware/upload.js";
import {
  listMine,
  getOne,
  createDraft,
  update,
  upsertDonationAccount,
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  sendMasjidOtp,
  confirmMasjidOtp,
  submit,
} from "../controllers/masjidController.js";

const router = Router();

router.use(auth, requireUser);

router.get("/mine", listMine);
router.post("/", createDraft);
router.get("/:id", getOne);
router.patch("/:id", update);
router.put("/:id/donation-account", upsertDonationAccount);
router.post("/:id/photos", uploadMasjidPhotos, uploadPhotos);
router.patch("/:id/photos/:photoId", updatePhoto);
router.delete("/:id/photos/:photoId", deletePhoto);
router.post("/:id/verify/send-otp", sendMasjidOtp);
router.post("/:id/verify/confirm-otp", confirmMasjidOtp);
router.post("/:id/submit", submit);

export default router;
