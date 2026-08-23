import { Router } from "express";
import { register, verifyOtp, resendOtp, login, me, forgotPassword, resetPassword } from "../controllers/userController.js";
import auth, { requireUser } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", auth, requireUser, me);

export default router;
