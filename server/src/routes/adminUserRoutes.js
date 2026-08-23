import { Router } from "express";
import { listUsers, updateUserStatus } from "../controllers/adminUserController.js";
import auth, { requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, requireAdmin, listUsers);
router.put("/:id/status", auth, requireAdmin, updateUserStatus);

export default router;
