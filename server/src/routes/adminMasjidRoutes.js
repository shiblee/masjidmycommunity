import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { uploadMasjidPhotos } from "../middleware/upload.js";
import {
  listAll,
  getOne,
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
} from "../controllers/adminMasjidController.js";
import {
  list as listContacts,
  create as createContact,
  update as updateContact,
  remove as removeContact,
} from "../controllers/adminMasjidContactController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listAll);
router.get("/:id", getOne);
router.patch("/:id", updateBasicInfo);
router.post("/:id/photos", uploadMasjidPhotos, uploadPhotos);
router.patch("/:id/photos/:photoId", updatePhoto);
router.delete("/:id/photos/:photoId", deletePhoto);
router.get("/:id/contacts", listContacts);
router.post("/:id/contacts", createContact);
router.patch("/:id/contacts/:contactId", updateContact);
router.delete("/:id/contacts/:contactId", removeContact);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
router.post("/:id/request-changes", requestChanges);
router.post("/:id/notes", addNote);
router.post("/:id/activate", activate);
router.post("/:id/deactivate", deactivate);
router.post("/:id/donation-account/verify", verifyDonationAccount);

export default router;
