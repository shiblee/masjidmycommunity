import { Router } from "express";
import { listPublic, getPublicOne, listFilters, listCategories, listContactDesignations, listBanks, listDeletionReasons } from "../controllers/publicMasjidController.js";

const router = Router();

router.get("/", listPublic);
router.get("/filters", listFilters);
router.get("/categories", listCategories);
router.get("/contact-designations", listContactDesignations);
router.get("/banks", listBanks);
router.get("/deletion-reasons", listDeletionReasons);
router.get("/:id", getPublicOne);

export default router;
