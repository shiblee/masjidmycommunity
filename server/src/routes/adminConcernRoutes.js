import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { listAll, counts, getOne, addNote, resolve, close, reopen, hardDelete } from "../controllers/adminConcernController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", listAll);
router.get("/counts", counts);
router.get("/:id", getOne);
router.post("/:id/notes", addNote);
router.post("/:id/resolve", resolve);
router.post("/:id/close", close);
router.post("/:id/reopen", reopen);
router.delete("/:id", hardDelete);

export default router;
