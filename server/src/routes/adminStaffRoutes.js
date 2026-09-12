import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { logActivity } from "../middleware/activityLogger.js";
import { listAll, listPermissionModules, getOne, create, update, deleteStaff, resetPassword, setStatus, getLoginHistory, getActivity, getPermissionHistory, getUsageAnalytics } from "../controllers/adminStaffController.js";

const router = Router();

router.use(auth, requireAdmin);

const view = requirePermission("staff", "view");
const add = requirePermission("staff", "add");
const edit = requirePermission("staff", "edit");
const del = requirePermission("staff", "delete");

router.get("/permission-modules", view, listPermissionModules);
router.get("/", view, listAll);
router.post("/", add, logActivity("staff", "add"), create);
router.get("/:id", view, getOne);
router.patch("/:id", edit, logActivity("staff", "edit"), update);
router.post("/:id/reset-password", edit, logActivity("staff", "edit"), resetPassword);
router.patch("/:id/status", edit, logActivity("staff", "edit"), setStatus);
router.delete("/:id", del, logActivity("staff", "delete"), deleteStaff);
router.get("/:id/login-history", view, getLoginHistory);
router.get("/:id/activity", view, getActivity);
router.get("/:id/permission-history", view, getPermissionHistory);
router.get("/:id/usage-analytics", view, getUsageAnalytics);

export default router;
