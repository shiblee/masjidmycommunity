import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import {
  list,
  create,
  update,
  remove,
  listSubcategories,
  createSubcategory,
  updateSubcategory,
  removeSubcategory,
} from "../controllers/adminRequirementCategoryController.js";

const router = Router();

router.use(auth, requireAdmin);

router.get("/", list);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

router.get("/:categoryId/subcategories", listSubcategories);
router.post("/:categoryId/subcategories", createSubcategory);
router.patch("/subcategories/:id", updateSubcategory);
router.delete("/subcategories/:id", removeSubcategory);

export default router;
