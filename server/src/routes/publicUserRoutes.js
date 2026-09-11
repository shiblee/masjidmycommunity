import { Router } from "express";
import { getPublicProfile, listDirectory } from "../controllers/publicUserController.js";
import optionalAuth from "../middleware/optionalAuth.js";

const router = Router();

// Must come before "/:username" -- otherwise Express would match this
// path as a username lookup.
router.get("/", listDirectory);
router.get("/:username", optionalAuth, getPublicProfile);

export default router;
