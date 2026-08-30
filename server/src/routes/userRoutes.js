import { Router } from "express";
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  sendLoginOtp,
  getOtpSettings,
  logout,
  me,
  forgotPassword,
  resetPassword,
  updateProfile,
  sendContactUpdateOtp,
  changePassword,
  uploadProfilePhoto as saveProfilePhoto,
  removeProfilePhoto,
} from "../controllers/userController.js";
import { listMine, markRead, markAllRead } from "../controllers/userNotificationController.js";
import * as workExperience from "../controllers/userWorkExperienceController.js";
import * as education from "../controllers/userEducationController.js";
import * as skills from "../controllers/userSkillController.js";
import * as hobbies from "../controllers/userHobbyController.js";
import auth, { requireUser } from "../middleware/auth.js";
import { uploadProfilePhoto } from "../middleware/upload.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/login/otp/send", sendLoginOtp);
router.get("/otp-settings", getOtpSettings);
router.post("/logout", auth, requireUser, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", auth, requireUser, me);
router.patch("/me", auth, requireUser, updateProfile);
router.post("/me/photo", auth, requireUser, uploadProfilePhoto, saveProfilePhoto);
router.delete("/me/photo", auth, requireUser, removeProfilePhoto);
router.post("/me/verify/send-otp", auth, requireUser, sendContactUpdateOtp);
router.put("/me/password", auth, requireUser, changePassword);

router.get("/me/work-experience", auth, requireUser, workExperience.list);
router.post("/me/work-experience", auth, requireUser, workExperience.create);
router.patch("/me/work-experience/:id", auth, requireUser, workExperience.update);
router.delete("/me/work-experience/:id", auth, requireUser, workExperience.remove);

router.get("/me/education", auth, requireUser, education.list);
router.post("/me/education", auth, requireUser, education.create);
router.patch("/me/education/:id", auth, requireUser, education.update);
router.delete("/me/education/:id", auth, requireUser, education.remove);

router.get("/meta/skills", auth, requireUser, skills.listMasterSkills);
router.get("/me/skills", auth, requireUser, skills.listMine);
router.post("/me/skills", auth, requireUser, skills.create);
router.patch("/me/skills/:id", auth, requireUser, skills.update);
router.delete("/me/skills/:id", auth, requireUser, skills.remove);

router.get("/meta/hobbies", auth, requireUser, hobbies.listMasterHobbies);
router.get("/me/hobbies", auth, requireUser, hobbies.listMine);
router.post("/me/hobbies", auth, requireUser, hobbies.create);
router.delete("/me/hobbies/:id", auth, requireUser, hobbies.remove);

router.get("/notifications", auth, requireUser, listMine);
router.patch("/notifications/read-all", auth, requireUser, markAllRead);
router.patch("/notifications/:id/read", auth, requireUser, markRead);

export default router;
