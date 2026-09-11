// One-off, self-cleaning verification for Staff Management Phase 2: creates
// a temporary staff account, logs it in for real, exercises the live
// page-view + permission-edit endpoints through the real deployed
// middleware/controllers, confirms AdminActivityLog + PermissionChangeLog
// rows are written correctly, then deletes everything it created.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { sequelize } from "../src/config/db.js";
import AdminUser from "../src/models/AdminUser.js";
import AdminActivityLog from "../src/models/AdminActivityLog.js";
import PermissionChangeLog from "../src/models/PermissionChangeLog.js";

const BASE_URL = "https://masjidmycommunity.com/api/admin";
const TEST_EMAIL = `staff-activity-test-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPass@2026";

async function call(path, token, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

let admin;
try {
  const hashed = await bcrypt.hash(TEST_PASSWORD, 10);
  admin = await AdminUser.create({
    name: "Activity Test Staff",
    email: TEST_EMAIL,
    password: hashed,
    role: "staff",
    status: "active",
    permissions: { staff: ["view", "edit"], masjid: ["view"] },
  });
  console.log("Created test staff:", admin.id, admin.email);

  const loginRes = await call("/auth/login", null, { method: "POST", body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }) });
  console.log("Login:", loginRes.status, "(expect 200)");
  const token = loginRes.body?.token;
  if (!token) throw new Error("Login did not return a token — aborting.");

  const pageView = await call("/activity/page-view", token, { method: "POST", body: JSON.stringify({ module: "masjid", path: "/admin/masjids" }) });
  console.log("POST /activity/page-view:", pageView.status, "(expect 204)");

  const newPermissions = { staff: ["view", "edit"], masjid: ["view", "edit"] };
  const editSelf = await call(`/staff/${admin.id}`, token, { method: "PATCH", body: JSON.stringify({ permissions: newPermissions }) });
  console.log("PATCH /staff/:id (permission change):", editSelf.status, "(expect 200)");

  // Give the res.on("finish") activity-log writes a moment to land.
  await new Promise((r) => setTimeout(r, 800));

  const activity = await call(`/staff/${admin.id}/activity`, token);
  const hasPageView = activity.body?.activity?.some((a) => a.activityType === "page_view" && a.module === "masjid");
  const hasStaffEdit = activity.body?.activity?.some((a) => a.activityType === "action" && a.module === "staff" && a.action === "edit");
  console.log("GET /staff/:id/activity:", activity.status, "page_view row found:", hasPageView, "staff-edit action row found:", hasStaffEdit);

  const history = await call(`/staff/${admin.id}/permission-history`, token);
  const entry = history.body?.history?.[0];
  const beforeOk = JSON.stringify(entry?.oldPermissions) === JSON.stringify({ staff: ["view", "edit"], masjid: ["view"] });
  const afterOk = JSON.stringify(entry?.newPermissions) === JSON.stringify(newPermissions);
  console.log("GET /staff/:id/permission-history:", history.status, "entries:", history.body?.history?.length, "before/after correct:", beforeOk && afterOk);

  const overview = await call(`/staff/${admin.id}`, token);
  console.log(
    "GET /staff/:id overview:",
    overview.status,
    "totalActivity:", overview.body?.overview?.totalActivity,
    "mostUsedModule:", overview.body?.overview?.mostUsedModule
  );
} finally {
  if (admin) {
    await AdminActivityLog.destroy({ where: { adminUserId: admin.id } });
    await PermissionChangeLog.destroy({ where: { staffId: admin.id } });
    await AdminUser.destroy({ where: { id: admin.id } });
    console.log("Cleaned up test staff account and its activity/audit rows.");
  }
  await sequelize.close();
}
