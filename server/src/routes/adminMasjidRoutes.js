import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requireModuleAccess, requirePermission } from "../middleware/permission.js";
import { logActivity } from "../middleware/activityLogger.js";
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
  hardDelete,
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

// Activity logging (Phase 2) -- only on write routes, only fires on a
// successful response (see activityLogger.js). Reuses the exact same
// action labels already assigned per route above.
const logAdd = logActivity("masjid", "add");
const logEdit = logActivity("masjid", "edit");
const logDelete = logActivity("masjid", "delete");
const logDecide = logActivity("masjid", "approve");

router.get("/", view, listAll);
router.post("/", add, logAdd, createMasjid);
router.get("/:id", view, getOne);
router.get("/:id/reviews", view, listMasjidReviews);
router.get("/:id/likers", view, listMasjidLikers);
router.patch("/:id", edit, logEdit, updateBasicInfo);
router.patch("/:id/seo", edit, logEdit, updateSeo);
router.post("/:id/seo/suggest", edit, suggestSeoMeta);
router.post("/:id/photos", add, logAdd, uploadMasjidPhotos, uploadPhotos);
router.patch("/:id/photos/:photoId", edit, logEdit, updatePhoto);
router.delete("/:id/photos/:photoId", del, logDelete, deletePhoto);
router.get("/:id/contacts", view, listContacts);
router.post("/:id/contacts", add, logAdd, createContact);
router.patch("/:id/contacts/:contactId", edit, logEdit, updateContact);
router.delete("/:id/contacts/:contactId", del, logDelete, removeContact);
router.post("/:id/contacts/:contactId/send-otp", edit, sendContactOtp);
router.post("/:id/contacts/:contactId/confirm-otp", edit, confirmContactOtp);
router.post("/:id/approve", decide, logDecide, approve);
router.post("/:id/reject", decide, logDecide, reject);
router.post("/:id/request-changes", decide, logDecide, requestChanges);
router.post("/:id/notes", edit, addNote);
router.post("/:id/activate", decide, logDecide, activate);
router.post("/:id/deactivate", decide, logDecide, deactivate);
router.post("/:id/delete", del, logDelete, remove);
router.delete("/:id", del, logDelete, hardDelete);
router.post("/:id/donation-account/verify", decide, logDecide, verifyDonationAccount);
router.patch("/reviews/:reviewId/visibility", edit, setReviewVisibility);
router.get("/:id/prayer-times", view, getPrayerRoster);
router.put("/:id/prayer-times", edit, logEdit, savePrayerRoster);
router.get("/:id/prayer-times/history", view, getPrayerHistory);
router.get("/:id/prayer-times/changes", view, getPrayerChangeDates);
router.get("/:id/green-tick", view, getGreenTickApplication);
router.patch("/:id/green-tick/representatives/:repId/identity", edit, logEdit, setRepresentativeIdentity);
router.patch("/:id/green-tick/representatives/:repId/authorization", edit, logEdit, setRepresentativeAuthorization);
router.patch("/:id/green-tick/documents/:docId", edit, logEdit, setDocumentStatus);
router.get("/:id/green-tick/documents/:docId/file", view, downloadGreenTickDocument);
router.get("/:id/green-tick/documents/download-all", view, downloadAllGreenTickDocuments);
router.post("/:id/green-tick/under-review", decide, logDecide, markUnderReview);
router.post("/:id/green-tick/request-documents", decide, logDecide, requestMoreDocuments);
router.post("/:id/green-tick/request-clarification", decide, logDecide, requestClarification);
router.post("/:id/green-tick/verification-failed", decide, logDecide, markVerificationFailed);
router.post("/:id/green-tick/approve", decide, logDecide, approveApplication);
router.post("/:id/green-tick/issue", decide, logDecide, issueGreenTick);
router.post("/:id/green-tick/suspend", decide, logDecide, suspendApplication);
router.post("/:id/green-tick/revoke", decide, logDecide, revokeApplication);

export default router;
