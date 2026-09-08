import { Router } from "express";
import auth, { requireAdmin } from "../middleware/auth.js";
import { getSettings, updateSettings, checkDuplicate, testSearch, testImport, getStatus, backfillCopy } from "../controllers/adminMasjidBotController.js";

const router = Router();
router.use(auth, requireAdmin);

router.get("/settings", getSettings);
router.patch("/settings", updateSettings);
router.post("/check-duplicate", checkDuplicate);
router.post("/test-search", testSearch);
router.post("/test-import", testImport);
router.get("/status", getStatus);
router.post("/backfill-copy", backfillCopy);

export default router;
