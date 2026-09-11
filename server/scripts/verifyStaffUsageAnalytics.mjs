// One-off, self-cleaning verification for Staff Management Phase 3: creates
// a temporary staff account, backdates a handful of AdminActivityLog rows
// directly (so the 30-day aggregation has real data to summarize without
// waiting on real usage), logs in for real, hits the live usage-analytics
// endpoint through the real deployed controller, checks the aggregates and
// (if AI is configured) the generated summary, then deletes everything.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { sequelize } from "../src/config/db.js";
import AdminUser from "../src/models/AdminUser.js";
import AdminActivityLog from "../src/models/AdminActivityLog.js";

const BASE_URL = "https://masjidmycommunity.com/api/admin";
const TEST_EMAIL = `staff-usage-test-${Date.now()}@example.com`;
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
    name: "Usage Analytics Test Staff",
    email: TEST_EMAIL,
    password: hashed,
    role: "staff",
    status: "active",
    permissions: { staff: ["view"], masjid: ["view"] },
  });
  console.log("Created test staff:", admin.id, admin.email);

  // Seed a realistic spread: a handful of masjid actions across the last
  // 10 days, then a deliberate spike today so isSpike should read true.
  const rows = [];
  for (let i = 10; i >= 1; i--) {
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - i);
    createdAt.setUTCHours(9 + (i % 3), 0, 0, 0);
    rows.push({ adminUserId: admin.id, activityType: "action", status: "success", module: "masjid", action: "edit", targetType: "masjid", targetId: 1, createdAt, updatedAt: createdAt });
  }
  for (let i = 0; i < 8; i++) {
    const createdAt = new Date();
    createdAt.setUTCHours(9, i, 0, 0);
    rows.push({ adminUserId: admin.id, activityType: "action", status: "success", module: "masjid", action: "edit", targetType: "masjid", targetId: 1, createdAt, updatedAt: createdAt });
  }
  await AdminActivityLog.bulkCreate(rows);
  console.log(`Seeded ${rows.length} backdated activity rows.`);

  const loginRes = await call("/auth/login", null, { method: "POST", body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }) });
  console.log("Login:", loginRes.status, "(expect 200)");
  const token = loginRes.body?.token;
  if (!token) throw new Error("Login did not return a token — aborting.");

  const usage = await call(`/staff/${admin.id}/usage-analytics`, token);
  console.log("GET /staff/:id/usage-analytics:", usage.status, "(expect 200)");
  const u = usage.body || {};
  console.log("dailyActivity length (expect 30):", u.dailyActivity?.length);
  console.log("totalActivity30d (expect 18):", u.totalActivity30d);
  console.log("moduleUsage[0] (expect Masjid/18):", JSON.stringify(u.moduleUsage?.[0]));
  console.log("todayCount (expect 8), isSpike (expect true):", u.todayCount, u.isSpike);
  console.log("aiConfigured:", u.aiConfigured, "aiSummary:", u.aiSummary);
} finally {
  if (admin) {
    await AdminActivityLog.destroy({ where: { adminUserId: admin.id } });
    await AdminUser.destroy({ where: { id: admin.id } });
    console.log("Cleaned up test staff account and its activity rows.");
  }
  await sequelize.close();
}
