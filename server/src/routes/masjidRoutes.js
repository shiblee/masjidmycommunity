import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import { uploadMasjidPhotos, uploadGreenTickDocuments } from "../middleware/upload.js";
import {
  listMine,
  getOne,
  createDraft,
  checkContent,
  update,
  upsertDonationAccount,
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  deleteMasjid,
  submit,
} from "../controllers/masjidController.js";
import {
  list as listContacts,
  create as createContact,
  update as updateContact,
  remove as removeContact,
  sendOtp as sendContactOtp,
  confirmOtp as confirmContactOtp,
} from "../controllers/masjidContactController.js";
import {
  getRoster as getPrayerRoster,
  saveRoster as savePrayerRoster,
  getHistory as getPrayerHistory,
  getChangeDates as getPrayerChangeDates,
} from "../controllers/masjidPrayerController.js";
import {
  getApplication as getGreenTickApplication,
  addRepresentative as addGreenTickRepresentative,
  removeRepresentative as removeGreenTickRepresentative,
  uploadDocuments as uploadGreenTickApplicationDocuments,
  deleteDocument as deleteGreenTickDocument,
  downloadDocument as downloadGreenTickDocument,
  submitApplication as submitGreenTickApplication,
} from "../controllers/greenTickController.js";

const router = Router();

router.use(auth, requireUser);

router.get("/mine", listMine);
router.post("/", createDraft);
router.post("/check-content", checkContent);
router.get("/:id", getOne);
router.patch("/:id", update);
router.put("/:id/donation-account", upsertDonationAccount);
router.post("/:id/photos", uploadMasjidPhotos, uploadPhotos);
router.patch("/:id/photos/:photoId", updatePhoto);
router.delete("/:id/photos/:photoId", deletePhoto);
router.get("/:id/contacts", listContacts);
router.post("/:id/contacts", createContact);
router.patch("/:id/contacts/:contactId", updateContact);
router.delete("/:id/contacts/:contactId", removeContact);
router.post("/:id/contacts/:contactId/send-otp", sendContactOtp);
router.post("/:id/contacts/:contactId/confirm-otp", confirmContactOtp);
router.get("/:id/prayer-times", getPrayerRoster);
router.put("/:id/prayer-times", savePrayerRoster);
router.get("/:id/prayer-times/history", getPrayerHistory);
router.get("/:id/prayer-times/changes", getPrayerChangeDates);
router.post("/:id/submit", submit);
router.post("/:id/delete", deleteMasjid);
router.get("/:id/green-tick", getGreenTickApplication);
router.post("/:id/green-tick/representatives", addGreenTickRepresentative);
router.delete("/:id/green-tick/representatives/:repId", removeGreenTickRepresentative);
router.post("/:id/green-tick/documents", uploadGreenTickDocuments, uploadGreenTickApplicationDocuments);
router.delete("/:id/green-tick/documents/:docId", deleteGreenTickDocument);
router.get("/:id/green-tick/documents/:docId/file", downloadGreenTickDocument);
router.post("/:id/green-tick/submit", submitGreenTickApplication);

export default router;
