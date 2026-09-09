import { Router } from "express";
import { listPublic, getPublicOne, listJobTypes, listExperienceLevels, listSkills, listJobCategories } from "../controllers/publicJobController.js";

const router = Router();

router.get("/", listPublic);
router.get("/meta/job-types", listJobTypes);
router.get("/meta/experience-levels", listExperienceLevels);
router.get("/meta/skills", listSkills);
router.get("/meta/categories", listJobCategories);
router.get("/:slug", getPublicOne);

export default router;
