import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { list, listCategories, getCoverage, upsert, remove } from "../controllers/adminTranslationController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.get("/categories", listCategories);
router.get("/coverage", getCoverage);
router.put("/:key", upsert);
router.delete("/:key", remove);

export default router;
