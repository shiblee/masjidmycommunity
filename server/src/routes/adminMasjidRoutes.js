import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requireModuleAccess, requirePermission } from "../middleware/permission.js";
import { uploadMasjidPhotos } from "../middleware/upload.js";
import {
  listAll,
  getOne,
  createMasjid,
  updateBasicInfo,
  updateSeo,
  suggestSeoMeta,
  uploadPhotos,
  updatePhoto,
  deletePhoto,
  approve,
  reject,
  requestChanges,
  addNote,
  activate,
  deactivate,
  remove,
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
  downloadAllDocuments as downloadAllGreenTickDocuments,
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

// Green Tick sub-routes live in this same router (nested under
// /:id/green-tick/...) rather than a separate route file -- they're
// enforced under the "masjid" module key here for Phase 1, even though the
// permission registry lists "greenTick" as its own checkbox row for a
// future finer split. masjidCorrections/pendingReviews (real separate
// route files) are outside this Phase's enforced-module list entirely.
router.use(auth, requireAdmin, requireModuleAccess("masjid"));

const view = requirePermission("masjid", "view");
const add = requirePermission("masjid", "add");
const edit = requirePermission("masjid", "edit");
const del = requirePermission("masjid", "delete");
const decide = requirePermission("masjid", "approve");

router.get("/", view, listAll);
router.post("/", add, createMasjid);
router.get("/:id", view, getOne);
router.get("/:id/reviews", view, listMasjidReviews);
router.get("/:id/likers", view, listMasjidLikers);
router.patch("/:id", edit, updateBasicInfo);
router.patch("/:id/seo", edit, updateSeo);
router.post("/:id/seo/suggest", edit, suggestSeoMeta);
router.post("/:id/photos", add, uploadMasjidPhotos, uploadPhotos);
router.patch("/:id/photos/:photoId", edit, updatePhoto);
router.delete("/:id/photos/:photoId", del, deletePhoto);
router.get("/:id/contacts", view, listContacts);
router.post("/:id/contacts", add, createContact);
router.patch("/:id/contacts/:contactId", edit, updateContact);
router.delete("/:id/contacts/:contactId", del, removeContact);
router.post("/:id/contacts/:contactId/send-otp", edit, sendContactOtp);
router.post("/:id/contacts/:contactId/confirm-otp", edit, confirmContactOtp);
router.post("/:id/approve", decide, approve);
router.post("/:id/reject", decide, reject);
router.post("/:id/request-changes", decide, requestChanges);
router.post("/:id/notes", edit, addNote);
router.post("/:id/activate", decide, activate);
router.post("/:id/deactivate", decide, deactivate);
router.post("/:id/delete", del, remove);
router.post("/:id/donation-account/verify", decide, verifyDonationAccount);
router.patch("/reviews/:reviewId/visibility", edit, setReviewVisibility);
router.get("/:id/prayer-times", view, getPrayerRoster);
router.put("/:id/prayer-times", edit, savePrayerRoster);
router.get("/:id/prayer-times/history", view, getPrayerHistory);
router.get("/:id/prayer-times/changes", view, getPrayerChangeDates);
router.get("/:id/green-tick", view, getGreenTickApplication);
router.patch("/:id/green-tick/representatives/:repId/identity", edit, setRepresentativeIdentity);
router.patch("/:id/green-tick/representatives/:repId/authorization", edit, setRepresentativeAuthorization);
router.patch("/:id/green-tick/documents/:docId", edit, setDocumentStatus);
router.get("/:id/green-tick/documents/:docId/file", view, downloadGreenTickDocument);
router.get("/:id/green-tick/documents/download-all", view, downloadAllGreenTickDocuments);
router.post("/:id/green-tick/under-review", decide, markUnderReview);
router.post("/:id/green-tick/request-documents", decide, requestMoreDocuments);
router.post("/:id/green-tick/request-clarification", decide, requestClarification);
router.post("/:id/green-tick/verification-failed", decide, markVerificationFailed);
router.post("/:id/green-tick/approve", decide, approveApplication);
router.post("/:id/green-tick/issue", decide, issueGreenTick);
router.post("/:id/green-tick/suspend", decide, suspendApplication);
router.post("/:id/green-tick/revoke", decide, revokeApplication);

export default router;
