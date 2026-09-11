import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { listAll, listPermissionModules, getOne, create, update, resetPassword, setStatus, getLoginHistory } from "../controllers/adminStaffController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/permission-modules", requirePermission("staff", "view"), listPermissionModules);
router.get("/", requirePermission("staff", "view"), listAll);
router.post("/", requirePermission("staff", "add"), create);
router.get("/:id", requirePermission("staff", "view"), getOne);
router.patch("/:id", requirePermission("staff", "edit"), update);
router.post("/:id/reset-password", requirePermission("staff", "edit"), resetPassword);
router.patch("/:id/status", requirePermission("staff", "edit"), setStatus);
router.get("/:id/login-history", requirePermission("staff", "view"), getLoginHistory);

export default router;
