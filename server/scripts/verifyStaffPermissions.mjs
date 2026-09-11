// One-off, self-cleaning verification: creates a temporary staff account
// with a narrow permission grant, mints a real JWT for it (same signing
// call the login controller uses), exercises the actual live HTTP
// endpoints through the real enforcement middleware, then deletes the
// test account. Nothing here is left behind either way.
import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sequelize } from "../src/config/db.js";
import AdminUser from "../src/models/AdminUser.js";

const BASE_URL = "https://masjidmycommunity.com/api/admin";
const TEST_EMAIL = `staff-perm-test-${Date.now()}@example.com`;

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
  const hashed = await bcrypt.hash("TestPass@2026", 10);
  admin = await AdminUser.create({
    name: "Permission Test Staff",
    email: TEST_EMAIL,
    password: hashed,
    role: "staff",
    status: "active",
    permissions: { masjid: ["view"] }, // view only, no campaigns access at all
  });
  console.log("Created test staff:", admin.id, admin.email);

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role, permissions: admin.permissions, type: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  const noToken = await call("/masjids", null);
  console.log("No token -> GET /masjids:", noToken.status, "(expect 401)");

  const viewMasjids = await call("/masjids", token);
  console.log("Granted view -> GET /masjids:", viewMasjids.status, "(expect 200)");

  const addMasjid = await call("/masjids", token, { method: "POST", body: JSON.stringify({ name: "Should not be created" }) });
  console.log("No 'add' grant -> POST /masjids:", addMasjid.status, addMasjid.body?.message, "(expect 403)");

  const campaigns = await call("/campaigns", token);
  console.log("No campaigns grant at all -> GET /campaigns:", campaigns.status, campaigns.body?.message, "(expect 403)");

  const staffList = await call("/staff", token);
  console.log("No staff grant -> GET /staff:", staffList.status, staffList.body?.message, "(expect 403)");

  // Real login through the actual endpoint too, confirming the account can
  // genuinely authenticate via the same screen a human staff member uses.
  const loginRes = await call("/auth/login", null, { method: "POST", body: JSON.stringify({ email: TEST_EMAIL, password: "TestPass@2026" }) });
  console.log("Real login via /auth/login:", loginRes.status, "role:", loginRes.body?.user?.role, "permissions:", JSON.stringify(loginRes.body?.user?.permissions), "(expect 200)");
} finally {
  if (admin) {
    await AdminUser.destroy({ where: { id: admin.id } });
    console.log("Cleaned up test staff account.");
  }
  await sequelize.close();
}
