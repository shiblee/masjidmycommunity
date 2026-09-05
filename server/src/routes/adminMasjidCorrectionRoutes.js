import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { list, getOne, actOnField } from "../controllers/adminMasjidCorrectionController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.get("/:id", getOne);
router.post("/:requestId/fields/:fieldId/action", actOnField);

export default router;
