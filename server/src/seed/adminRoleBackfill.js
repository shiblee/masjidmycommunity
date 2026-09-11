import AdminUser from "../models/AdminUser.js";

// One-time, idempotent: every AdminUser account that predates the Staff
// Management feature carries the old default role string
// "Platform Administrator" -- promote those to "super_admin" so they keep
// unrestricted access (permission checks bypass entirely for this role).
// Never touches a row already migrated (role no longer matches after the
// first run) or a row explicitly created as "staff".
export async function ensureAdminRoleDefaults() {
  await AdminUser.update({ role: "super_admin" }, { where: { role: "Platform Administrator" } });
}
