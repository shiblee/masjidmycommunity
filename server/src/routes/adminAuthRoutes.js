import { Router } from "express";
import { login, me, updateProfile, updateAvatar, updatePassword, updatePreferences } from "../controllers/adminAuthController.js";
import auth, { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.get("/me", auth, requireAdmin, me);
router.put("/profile", auth, requireAdmin, updateProfile);
router.put("/avatar", auth, requireAdmin, updateAvatar);
router.put("/password", auth, requireAdmin, updatePassword);
router.put("/preferences", auth, requireAdmin, updatePreferences);

export default router;
