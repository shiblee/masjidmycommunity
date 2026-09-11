import { recordAdminActivity } from "../utils/adminActivityLog.js";

// Composes into the same per-route middleware chain as
// requirePermission()/requireModuleAccess() -- res.on("finish") fires once
// the real response is actually sent, so it captures the true final status
// code regardless of where in the chain this is registered. Only logs a
// row when the request actually succeeded (status < 400); a 403/500 is
// already implicit in there being no corresponding success row, and a
// failed write shouldn't be recorded as if it happened.
//
// Deliberately for WRITE routes only (POST/PATCH/PUT/DELETE) -- read (GET)
// traffic is covered separately by client-side page-visit tracking
// (AdminLayout.jsx), which answers "where did they browse" without
// logging one row per list/detail fetch here.
export function logActivity(module, action) {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      const targetId = req.params?.id ? Number(req.params.id) : null;
      recordAdminActivity({
        req,
        module,
        action,
        targetType: module,
        targetId: Number.isFinite(targetId) ? targetId : null,
      });
    });
    next();
  };
}
