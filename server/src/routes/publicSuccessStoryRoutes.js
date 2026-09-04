import { Router } from "express";
import { list, getOne } from "../controllers/publicSuccessStoryController.js";

const router = Router();

router.get("/", list);
router.get("/:slug", getOne);

export default router;
