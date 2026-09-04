import { Router } from "express";
import { listUsers, updateUserStatus, getUserActivity, getUser, updateUserProfile, getProfileChangeLog } from "../controllers/adminUserController.js";
import * as education from "../controllers/adminUserEducationController.js";
import * as workExperience from "../controllers/adminUserWorkExperienceController.js";
import * as skills from "../controllers/adminUserSkillController.js";
import * as hobbies from "../controllers/adminUserHobbyController.js";
import * as photo from "../controllers/adminUserPhotoController.js";
import { generateUserBio } from "../controllers/adminUserBioController.js";
import auth, { requireAdmin } from "../middleware/auth.js";
import { uploadProfilePhoto } from "../middleware/upload.js";

const router = Router();

router.get("/", auth, requireAdmin, listUsers);
router.get("/:id", auth, requireAdmin, getUser);
router.patch("/:id/profile", auth, requireAdmin, updateUserProfile);
router.get("/:id/activity", auth, requireAdmin, getUserActivity);
router.get("/:id/profile-change-log", auth, requireAdmin, getProfileChangeLog);
router.put("/:id/status", auth, requireAdmin, updateUserStatus);

router.get("/:userId/education", auth, requireAdmin, education.list);
router.post("/:userId/education/enhance", auth, requireAdmin, education.enhance);
router.post("/:userId/education", auth, requireAdmin, education.create);
router.patch("/:userId/education/:id", auth, requireAdmin, education.update);
router.delete("/:userId/education/:id", auth, requireAdmin, education.remove);

router.get("/:userId/work-experience", auth, requireAdmin, workExperience.list);
router.post("/:userId/work-experience/enhance", auth, requireAdmin, workExperience.enhance);
router.post("/:userId/work-experience", auth, requireAdmin, workExperience.create);
router.patch("/:userId/work-experience/:id", auth, requireAdmin, workExperience.update);
router.delete("/:userId/work-experience/:id", auth, requireAdmin, workExperience.remove);

router.get("/:userId/skills", auth, requireAdmin, skills.list);
router.post("/:userId/skills", auth, requireAdmin, skills.create);
router.patch("/:userId/skills/:id", auth, requireAdmin, skills.update);
router.delete("/:userId/skills/:id", auth, requireAdmin, skills.remove);

router.get("/:userId/hobbies", auth, requireAdmin, hobbies.list);
router.post("/:userId/hobbies", auth, requireAdmin, hobbies.create);
router.delete("/:userId/hobbies/:id", auth, requireAdmin, hobbies.remove);

router.post("/:userId/photo", auth, requireAdmin, uploadProfilePhoto, photo.upload);
router.delete("/:userId/photo", auth, requireAdmin, photo.remove);

router.post("/:userId/bio/generate", auth, requireAdmin, generateUserBio);

export default router;
