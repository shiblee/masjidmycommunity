import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { list, create, update, remove, getContent, upsertContent } from "../controllers/adminPageController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);
router.get("/:id/content", getContent);
router.put("/:id/content/:lang", upsertContent);

export default router;
