import { Router } from "express";
import { getPage } from "../controllers/publicPageController.js";

const router = Router();

router.get("/:slug", getPage);

export default router;
