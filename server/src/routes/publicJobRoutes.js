import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import jobAiAskRateLimit from "../middleware/jobAiAskRateLimit.js";
import { listPublic, getPublicOne, listJobTypes, listExperienceLevels, listSkills, listJobCategories, listMyLiked, listRecommended, listBySkills, listMapPoints } from "../controllers/publicJobController.js";
import { getFavoriteStatus, addFavorite, removeFavorite } from "../controllers/jobFavoriteController.js";
import { ask } from "../controllers/publicJobAiController.js";

const router = Router();

router.get("/", optionalAuth, listPublic);
router.get("/map", listMapPoints);
router.get("/meta/job-types", listJobTypes);
router.get("/meta/experience-levels", listExperienceLevels);
router.get("/meta/skills", listSkills);
router.get("/meta/categories", listJobCategories);
router.get("/liked/mine", auth, requireUser, listMyLiked);
router.get("/recommended", auth, requireUser, listRecommended);
router.get("/by-skills", auth, requireUser, listBySkills);
router.post("/ai-ask", optionalAuth, jobAiAskRateLimit, ask);
router.get("/:id/favorite", auth, requireUser, getFavoriteStatus);
router.post("/:id/favorite", auth, requireUser, addFavorite);
router.delete("/:id/favorite", auth, requireUser, removeFavorite);
router.get("/:slug", optionalAuth, getPublicOne);

export default router;
