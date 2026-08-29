import { Router } from "express";
import optionalAuth from "../middleware/optionalAuth.js";
import { listTypes, submit } from "../controllers/publicConcernController.js";

const router = Router();

router.get("/types", listTypes);
router.post("/", optionalAuth, submit);

export default router;
