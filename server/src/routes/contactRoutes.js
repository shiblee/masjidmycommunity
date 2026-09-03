import { Router } from "express";
import { listTopics, submit } from "../controllers/publicContactController.js";

const router = Router();

router.get("/topics", listTopics);
router.post("/", submit);

export default router;
