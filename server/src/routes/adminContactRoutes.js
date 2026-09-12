import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { listAll, counts, getOne, addNote, reply, markInProgress, close, reopen, hardDelete } from "../controllers/adminContactController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listAll);
router.get("/counts", counts);
router.get("/:id", getOne);
router.post("/:id/notes", addNote);
router.post("/:id/reply", reply);
router.post("/:id/in-progress", markInProgress);
router.post("/:id/close", close);
router.post("/:id/reopen", reopen);
router.delete("/:id", hardDelete);

export default router;
