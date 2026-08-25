import { Router } from "express";
import { listPublic, getPublicOne, listFilters, listCategories } from "../controllers/publicMasjidController.js";

const router = Router();

router.get("/", listPublic);
router.get("/filters", listFilters);
router.get("/categories", listCategories);
router.get("/:id", getPublicOne);

export default router;
