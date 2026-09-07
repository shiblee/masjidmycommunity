import { Router } from "express";
import optionalAuth from "../middleware/optionalAuth.js";
import { listPublic, getPublicOne, listByMasjid, listCategories, listClassifications } from "../controllers/publicCampaignController.js";

const router = Router();

router.get("/", listPublic);
router.get("/categories", listCategories);
router.get("/classifications", listClassifications);
router.get("/by-masjid/:masjidId", listByMasjid);
router.get("/:slug", optionalAuth, getPublicOne);

export default router;
