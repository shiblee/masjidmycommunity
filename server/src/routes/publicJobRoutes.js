import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { listPublic, getPublicOne, listJobTypes, listExperienceLevels, listSkills, listJobCategories, listMyLiked } from "../controllers/publicJobController.js";
import { getFavoriteStatus, addFavorite, removeFavorite } from "../controllers/jobFavoriteController.js";

const router = Router();

router.get("/", optionalAuth, listPublic);
router.get("/meta/job-types", listJobTypes);
router.get("/meta/experience-levels", listExperienceLevels);
router.get("/meta/skills", listSkills);
router.get("/meta/categories", listJobCategories);
router.get("/liked/mine", auth, requireUser, listMyLiked);
router.get("/:id/favorite", auth, requireUser, getFavoriteStatus);
router.post("/:id/favorite", auth, requireUser, addFavorite);
router.delete("/:id/favorite", auth, requireUser, removeFavorite);
router.get("/:slug", optionalAuth, getPublicOne);

export default router;
