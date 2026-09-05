import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import { listPublic, listMapPoints, listStats, getPublicOne, listFilters, listCategories, listContactDesignations, listBanks, listDeletionReasons } from "../controllers/publicMasjidController.js";
import { listReviews, getMyReview, upsertMyReview, deleteMyReview, getPublicReviewSettings } from "../controllers/masjidReviewController.js";
import { getFavoriteStatus, addFavorite, removeFavorite } from "../controllers/masjidFavoriteController.js";
import { suggestEdit } from "../controllers/masjidSuggestionController.js";

const router = Router();

router.get("/", listPublic);
router.get("/map", listMapPoints);
router.get("/stats", listStats);
router.get("/filters", listFilters);
router.get("/categories", listCategories);
router.get("/contact-designations", listContactDesignations);
router.get("/banks", listBanks);
router.get("/deletion-reasons", listDeletionReasons);
router.get("/review-settings", getPublicReviewSettings);
router.get("/:id/reviews", listReviews);
router.get("/:id/reviews/mine", auth, requireUser, getMyReview);
router.post("/:id/reviews", auth, requireUser, upsertMyReview);
router.delete("/:id/reviews", auth, requireUser, deleteMyReview);
router.get("/:id/favorite", auth, requireUser, getFavoriteStatus);
router.post("/:id/favorite", auth, requireUser, addFavorite);
router.delete("/:id/favorite", auth, requireUser, removeFavorite);
router.post("/:id/suggest-edit", auth, requireUser, suggestEdit);
router.get("/:id", getPublicOne);

export default router;
