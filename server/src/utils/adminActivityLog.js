import AdminActivityLog from "../models/AdminActivityLog.js";
import { getRequestContext } from "./requestContext.js";

// Best-effort, same contract as recordProfileChange -- a logging failure
// must never break the real request that triggered it.
export async function recordAdminActivity({ req, module, action, targetType = null, targetId = null, summary = null, activityType = "action" }) {
  try {
    await AdminActivityLog.create({
      adminUserId: req.user.id,
      name: req.user.name || null,
      email: req.user.email,
      activityType,
      status: "success",
      module,
      action,
      targetType,
      targetId,
      summary,
      ...getRequestContext(req),
    });
  } catch (error) {
    console.error("AdminActivityLog write failed:", error.message);
  }
}
