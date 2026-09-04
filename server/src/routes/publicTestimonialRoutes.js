import { Router } from "express";
import { list } from "../controllers/publicTestimonialController.js";

const router = Router();

router.get("/", list);

export default router;
