import { Router } from "express";
import { listPublished } from "../controllers/publicCommunityController.js";

const router = Router();

router.get("/activities", listPublished);

export default router;
