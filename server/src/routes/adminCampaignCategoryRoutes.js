import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { list, create, update, remove } from "../controllers/adminCampaignCategoryController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;
