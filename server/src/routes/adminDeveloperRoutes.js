import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { logActivity } from "../middleware/activityLogger.js";
import {
  listModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  saveSections,
  listVersions,
  search,
} from "../controllers/adminDeveloperController.js";

const router = Router();

router.use(auth, requireAdmin);

const view = requirePermission("developer", "view");
const edit = requirePermission("developer", "edit");

router.get("/search", view, search);
router.get("/modules", view, listModules);
router.post("/modules", edit, logActivity("developer", "add"), createModule);
router.get("/modules/:id", view, getModule);
router.patch("/modules/:id", edit, logActivity("developer", "edit"), updateModule);
router.delete("/modules/:id", edit, logActivity("developer", "delete"), deleteModule);
router.put("/modules/:id/sections", edit, logActivity("developer", "edit"), saveSections);
router.get("/modules/:id/versions", view, listVersions);

export default router;
