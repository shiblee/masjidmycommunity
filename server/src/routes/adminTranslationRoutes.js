import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { list, listCategories, upsert, remove } from "../controllers/adminTranslationController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.get("/categories", listCategories);
router.put("/:key", upsert);
router.delete("/:key", remove);

export default router;
