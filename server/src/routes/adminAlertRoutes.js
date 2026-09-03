import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { list, markRead, markAllRead } from "../controllers/adminAlertController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

export default router;
