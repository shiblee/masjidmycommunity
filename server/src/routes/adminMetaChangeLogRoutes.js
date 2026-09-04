import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { list } from "../controllers/adminMetaChangeLogController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);

export default router;
