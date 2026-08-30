import { Router } from "express";
import { listLanguages, getTranslations } from "../controllers/publicI18nController.js";

const router = Router();

router.get("/languages", listLanguages);
router.get("/translations/:code", getTranslations);

export default router;
