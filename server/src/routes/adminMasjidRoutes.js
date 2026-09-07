import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { uploadMasjidPhotos } from "../middleware/upload.js";
import {
  listAll,
  getOne,
  createMasjid,
  updateBasicInfo,
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  approve,
  reject,
  requestChanges,
  addNote,
  activate,
  deactivate,
  verifyDonationAccount,
  setReviewVisibility,
  listMasjidReviews,
  listMasjidLikers,
} from "../controllers/adminMasjidController.js";
import {
  list as listContacts,
  create as createContact,
  update as updateContact,
  remove as removeContact,
  sendOtp as sendContactOtp,
  confirmOtp as confirmContactOtp,
} from "../controllers/adminMasjidContactController.js";
import {
  getRoster as getPrayerRoster,
  saveRoster as savePrayerRoster,
  getHistory as getPrayerHistory,
  getChangeDates as getPrayerChangeDates,
} from "../controllers/adminMasjidPrayerController.js";
import {
  getApplication as getGreenTickApplication,
  setRepresentativeIdentity,
  setRepresentativeAuthorization,
  setDocumentStatus,
  downloadDocument as downloadGreenTickDocument,
  markUnderReview,
  requestMoreDocuments,
  requestClarification,
  markVerificationFailed,
  approveApplication,
  issueGreenTick,
  suspendApplication,
  revokeApplication,
} from "../controllers/adminGreenTickController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listAll);
router.post("/", createMasjid);
router.get("/:id", getOne);
router.get("/:id/reviews", listMasjidReviews);
router.get("/:id/likers", listMasjidLikers);
router.patch("/:id", updateBasicInfo);
router.post("/:id/photos", uploadMasjidPhotos, uploadPhotos);
router.patch("/:id/photos/:photoId", updatePhoto);
router.delete("/:id/photos/:photoId", deletePhoto);
router.get("/:id/contacts", listContacts);
router.post("/:id/contacts", createContact);
router.patch("/:id/contacts/:contactId", updateContact);
router.delete("/:id/contacts/:contactId", removeContact);
router.post("/:id/contacts/:contactId/send-otp", sendContactOtp);
router.post("/:id/contacts/:contactId/confirm-otp", confirmContactOtp);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
router.post("/:id/request-changes", requestChanges);
router.post("/:id/notes", addNote);
router.post("/:id/activate", activate);
router.post("/:id/deactivate", deactivate);
router.post("/:id/donation-account/verify", verifyDonationAccount);
router.patch("/reviews/:reviewId/visibility", setReviewVisibility);
router.get("/:id/prayer-times", getPrayerRoster);
router.put("/:id/prayer-times", savePrayerRoster);
router.get("/:id/prayer-times/history", getPrayerHistory);
router.get("/:id/prayer-times/changes", getPrayerChangeDates);
router.get("/:id/green-tick", getGreenTickApplication);
router.patch("/:id/green-tick/representatives/:repId/identity", setRepresentativeIdentity);
router.patch("/:id/green-tick/representatives/:repId/authorization", setRepresentativeAuthorization);
router.patch("/:id/green-tick/documents/:docId", setDocumentStatus);
router.get("/:id/green-tick/documents/:docId/file", downloadGreenTickDocument);
router.post("/:id/green-tick/under-review", markUnderReview);
router.post("/:id/green-tick/request-documents", requestMoreDocuments);
router.post("/:id/green-tick/request-clarification", requestClarification);
router.post("/:id/green-tick/verification-failed", markVerificationFailed);
router.post("/:id/green-tick/approve", approveApplication);
router.post("/:id/green-tick/issue", issueGreenTick);
router.post("/:id/green-tick/suspend", suspendApplication);
router.post("/:id/green-tick/revoke", revokeApplication);

export default router;
