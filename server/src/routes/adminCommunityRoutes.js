import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { requireModuleAccess } from "../middleware/permission.js";
import { listAll, update, publish, hide, pin, unpin, remove } from "../controllers/adminCommunityController.js";

const router = Router();

router.use(auth, requireAdmin, requireModuleAccess("communityWall"));

router.get("/", listAll);
router.patch("/:id", update);
router.post("/:id/publish", publish);
router.post("/:id/hide", hide);
router.post("/:id/pin", pin);
router.post("/:id/unpin", unpin);
router.delete("/:id", remove);

export default router;
