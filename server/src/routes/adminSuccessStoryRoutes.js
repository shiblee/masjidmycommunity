import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { uploadSuccessStoryImage } from "../middleware/upload.js";
import { list, create, update, remove } from "../controllers/adminSuccessStoryController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.post("/", uploadSuccessStoryImage, create);
router.patch("/:id", uploadSuccessStoryImage, update);
router.delete("/:id", remove);

export default router;
