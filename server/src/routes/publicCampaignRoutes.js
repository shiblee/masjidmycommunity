import { Router } from "express";
import { listPublic, getPublicOne, listByMasjid, listCategories } from "../controllers/publicCampaignController.js";

const router = Router();

router.get("/", listPublic);
router.get("/categories", listCategories);
router.get("/by-masjid/:masjidId", listByMasjid);
router.get("/:slug", getPublicOne);

export default router;
