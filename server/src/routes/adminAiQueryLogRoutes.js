import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { list, counts } from "../controllers/adminAiQueryLogController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.get("/counts", counts);

export default router;
