import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { uploadTestimonialPhoto } from "../middleware/upload.js";
import { list, create, update, remove } from "../controllers/adminTestimonialController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.post("/", uploadTestimonialPhoto, create);
router.patch("/:id", uploadTestimonialPhoto, update);
router.delete("/:id", remove);

export default router;
