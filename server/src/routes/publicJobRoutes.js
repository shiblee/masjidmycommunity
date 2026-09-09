import { Router } from "express";
import { listPublic, getPublicOne } from "../controllers/publicJobController.js";

const router = Router();

router.get("/", listPublic);
router.get("/:slug", getPublicOne);

export default router;
