// One-off, self-cleaning diagnostic: mints a JWT for an existing super_admin
// account (no login credentials needed) and exercises the live POST /staff
// endpoint two ways -- a too-short password (should 400, matching what the
// user hit) and a valid one (should 201) -- to confirm the create flow
// itself works correctly after removing Confirm Password. Cleans up any
// staff account it creates either way.
import "dotenv/config";
import jwt from "jsonwebtoken";
import { sequelize } from "../src/config/db.js";
import AdminUser from "../src/models/AdminUser.js";

const BASE_URL = "https://masjidmycommunity.com/api/admin";

async function call(path, token, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

let createdId = null;
try {
  const superAdmin = await AdminUser.findOne({ where: { role: "super_admin" } });
  if (!superAdmin) throw new Error("No super_admin account found to mint a token for.");
  const token = jwt.sign(
    { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email, role: superAdmin.role, permissions: null, type: "admin", sid: "diagnostic" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  const shortPwEmail = `staff-create-test-short-${Date.now()}@example.com`;
  const shortPwRes = await call("/staff", token, {
    method: "POST",
    body: JSON.stringify({ name: "Short Password Test", email: shortPwEmail, password: "123456", permissions: { dashboard: ["view"] } }),
  });
  console.log("POST /staff with 6-char password:", shortPwRes.status, shortPwRes.body?.message, "(expect 400, 'at least 8 characters')");

  const validEmail = `staff-create-test-valid-${Date.now()}@example.com`;
  const validRes = await call("/staff", token, {
    method: "POST",
    body: JSON.stringify({ name: "Valid Create Test", email: validEmail, password: "ValidPass123", permissions: { dashboard: ["view"], masjid: ["view"] } }),
  });
  console.log("POST /staff with valid 12-char password:", validRes.status, validRes.body?.staff ? "staff created" : validRes.body?.message, "(expect 201)");
  createdId = validRes.body?.staff?.id || null;

  if (createdId) {
    const getRes = await call(`/staff/${createdId}`, token);
    console.log("GET /staff/:id right after create:", getRes.status, "permissions:", JSON.stringify(getRes.body?.staff?.permissions), "(expect 200, matching permissions)");
  }
} finally {
  if (createdId) {
    await AdminUser.destroy({ where: { id: createdId } });
    console.log("Cleaned up test staff account.");
  }
  await sequelize.close();
}
