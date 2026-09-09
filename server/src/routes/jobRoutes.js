import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import { listMine, getOne, createJob, updateJob, closeJob, reopenJob } from "../controllers/jobController.js";

const router = Router();

router.use(auth, requireUser);

router.get("/mine", listMine);
router.post("/", createJob);
router.get("/:id", getOne);
router.patch("/:id", updateJob);
router.post("/:id/close", closeJob);
router.post("/:id/reopen", reopenJob);

export default router;
