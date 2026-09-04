import { Router } from "express";
import auth, { requireUser } from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { uploadWallPostMedia } from "../middleware/upload.js";
import {
  listPublished,
  castVote,
  listComments,
  createComment,
  updateComment,
  deleteComment,
  castCommentVote,
  createPost,
  updatePost,
  deletePost,
  getContentSettings,
  getCommunityStats,
  mentionSearch,
  castImageVote,
  listImageComments,
  createImageComment,
  updateImageComment,
  deleteImageComment,
} from "../controllers/publicCommunityController.js";

const router = Router();

router.get("/content-settings", getContentSettings);
router.get("/stats", getCommunityStats);
router.get("/mention-search", mentionSearch);
router.get("/activities", optionalAuth, listPublished);
router.post("/activities/:id/vote", auth, requireUser, castVote);

router.get("/activities/:activityId/comments", optionalAuth, listComments);
router.post("/activities/:activityId/comments", auth, requireUser, createComment);
router.patch("/activities/:activityId/comments/:id", auth, requireUser, updateComment);
router.delete("/activities/:activityId/comments/:id", auth, requireUser, deleteComment);
router.post("/activities/:activityId/comments/:id/vote", auth, requireUser, castCommentVote);

router.post("/posts", auth, requireUser, uploadWallPostMedia, createPost);
router.patch("/posts/:id", auth, requireUser, updatePost);
router.delete("/posts/:id", auth, requireUser, deletePost);

router.post("/images/:imageId/vote", auth, requireUser, castImageVote);
router.get("/images/:imageId/comments", optionalAuth, listImageComments);
router.post("/images/:imageId/comments", auth, requireUser, createImageComment);
router.patch("/images/:imageId/comments/:id", auth, requireUser, updateImageComment);
router.delete("/images/:imageId/comments/:id", auth, requireUser, deleteImageComment);
router.post("/images/:imageId/comments/:id/vote", auth, requireUser, castCommentVote);

export default router;
