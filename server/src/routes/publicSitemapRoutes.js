import { Router } from "express";
import { getSitemapXml } from "../controllers/publicSitemapController.js";

const router = Router();

router.get("/", getSitemapXml);

export default router;
