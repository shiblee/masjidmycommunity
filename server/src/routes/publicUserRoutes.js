import { Router } from "express";
import { getPublicProfile } from "../controllers/publicUserController.js";
import optionalAuth from "../middleware/optionalAuth.js";

const router = Router();

router.get("/:username", optionalAuth, getPublicProfile);

export default router;
