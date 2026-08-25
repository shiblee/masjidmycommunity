import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import {
  listAll,
  getOne,
  approve,
  reject,
  requestChanges,
  addNote,
  activate,
  deactivate,
  verifyDonationAccount,
} from "../controllers/adminMasjidController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listAll);
router.get("/:id", getOne);
router.post("/:id/approve", approve);
router.post("/:id/reject", reject);
router.post("/:id/request-changes", requestChanges);
router.post("/:id/notes", addNote);
router.post("/:id/activate", activate);
router.post("/:id/deactivate", deactivate);
router.post("/:id/donation-account/verify", verifyDonationAccount);

export default router;
