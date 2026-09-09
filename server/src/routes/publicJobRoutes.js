import { Router } from "express";
import { listPublic, getPublicOne, listJobTypes } from "../controllers/publicJobController.js";

const router = Router();

router.get("/", listPublic);
router.get("/meta/job-types", listJobTypes);
router.get("/:slug", getPublicOne);

export default router;
