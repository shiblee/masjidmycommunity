import { Router } from "express";
import { submit } from "../controllers/publicContactController.js";

const router = Router();

router.post("/", submit);

export default router;
