import { Router } from "express";
import { listUsers, updateUserStatus, getUserActivity, getUser, updateUserProfile, getProfileChangeLog } from "../controllers/adminUserController.js";
import * as education from "../controllers/adminUserEducationController.js";
import * as workExperience from "../controllers/adminUserWorkExperienceController.js";
import * as skills from "../controllers/adminUserSkillController.js";
import * as hobbies from "../controllers/adminUserHobbyController.js";
import * as photo from "../controllers/adminUserPhotoController.js";
import { generateUserBio } from "../controllers/adminUserBioController.js";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requireModuleAccess } from "../middleware/permission.js";
import { uploadProfilePhoto } from "../middleware/upload.js";

const router = Router();

router.use(auth, requireAdmin, requireModuleAccess("users"));

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id/profile", updateUserProfile);
router.get("/:id/activity", getUserActivity);
router.get("/:id/profile-change-log", getProfileChangeLog);
router.put("/:id/status", updateUserStatus);

router.get("/:userId/education", education.list);
router.post("/:userId/education/enhance", education.enhance);
router.post("/:userId/education", education.create);
router.patch("/:userId/education/:id", education.update);
router.delete("/:userId/education/:id", education.remove);

router.get("/:userId/work-experience", workExperience.list);
router.post("/:userId/work-experience/enhance", workExperience.enhance);
router.post("/:userId/work-experience", workExperience.create);
router.patch("/:userId/work-experience/:id", workExperience.update);
router.delete("/:userId/work-experience/:id", workExperience.remove);

router.get("/:userId/skills", skills.list);
router.post("/:userId/skills", skills.create);
router.patch("/:userId/skills/:id", skills.update);
router.delete("/:userId/skills/:id", skills.remove);

router.get("/:userId/hobbies", hobbies.list);
router.post("/:userId/hobbies", hobbies.create);
router.delete("/:userId/hobbies/:id", hobbies.remove);

router.post("/:userId/photo", uploadProfilePhoto, photo.upload);
router.delete("/:userId/photo", photo.remove);

router.post("/:userId/bio/generate", generateUserBio);

export default router;
