import { Router } from "express";
import { getPhotoMedia } from "../controllers/masjidPhotoProxyController.js";

const router = Router();

// No auth — masjid photos are already public once the masjid is approved,
// same as any /uploads/masjid-photos/... file. Mounted before the
// auth-required /api/masjids routes in app.js so this specific prefix is
// matched first.
router.get("/:photoId/media", getPhotoMedia);

export default router;
