import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import { createRequirement, listMine } from "../controllers/requirementController.js";

const router = Router();

router.use(auth, requireUser);

router.get("/mine", listMine);
router.post("/", createRequirement);

export default router;
