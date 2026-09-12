import { Router } from "express";
import { login, logout, me, updateProfile, updateAvatar, updatePassword, updatePreferences, getMyLoginHistory } from "../controllers/adminAuthController.js";
import auth, { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.post("/logout", auth, requireAdmin, logout);
router.get("/me", auth, requireAdmin, me);
router.get("/login-history", auth, requireAdmin, getMyLoginHistory);
router.put("/profile", auth, requireAdmin, updateProfile);
router.put("/avatar", auth, requireAdmin, updateAvatar);
router.put("/password", auth, requireAdmin, updatePassword);
router.put("/preferences", auth, requireAdmin, updatePreferences);

export default router;
