// Sits after auth + requireAdmin in a route chain. A "super_admin" (every
// admin account before this feature existed, backfilled by
// adminRoleBackfill.js) bypasses permission checks entirely -- only
// accounts explicitly created as role:"staff" are ever actually
// constrained. Checking JWT-decoded req.user.role/permissions directly
// (not re-fetching AdminUser here) keeps this fast and stateless, same as
// requireAdmin; a deactivated/edited account's stale token still expires
// within its normal 12h/30d window like any other admin token today.
//
// `action` may be a static string ("view") or a function of the request
// (req => req.method === "GET" ? "view" : "edit") for routes where the
// same handler path covers multiple semantics.
export function requirePermission(moduleKey, action) {
  return (req, res, next) => {
    if (req.user?.role === "super_admin") return next();

    const resolvedAction = typeof action === "function" ? action(req) : action;
    const granted = req.user?.permissions?.[moduleKey];
    if (Array.isArray(granted) && granted.includes(resolvedAction)) return next();

    return res.status(403).json({ message: `You don't have permission to ${resolvedAction || "access"} ${moduleKey}.` });
  };
}

// Coarser module-level gate -- requires ANY granted action on the module,
// used where per-action enforcement hasn't been wired into a route file
// yet (see permission.js's module doc comment in the plan). Still real
// protection: a staff account with zero grant for a module can't reach any
// of its routes at all.
export function requireModuleAccess(moduleKey) {
  return (req, res, next) => {
    if (req.user?.role === "super_admin") return next();
    const granted = req.user?.permissions?.[moduleKey];
    if (Array.isArray(granted) && granted.length > 0) return next();
    return res.status(403).json({ message: `You don't have access to ${moduleKey}.` });
  };
}
