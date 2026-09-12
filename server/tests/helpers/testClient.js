// Shared helper for every test in this suite. There is no staging
// environment or test database for this app -- these tests run against
// the real deployed API (override with TEST_BASE_URL for a future
// staging/local target). Every test that creates data is responsible for
// cleaning it up via the delete helpers below, using the same
// self-cleaning pattern already used for manual live verification
// throughout this project's development.
export const BASE_URL = process.env.TEST_BASE_URL || "https://masjidmycommunity.com";

export async function api(path, opts = {}) {
  const { headers, body, ...rest } = opts;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // Some responses (204 No Content) have no body -- not an error.
  }
  return { status: res.status, body: json };
}

// Cached for the whole test run -- one admin login, reused everywhere,
// rather than one per test.
let cachedAdmin = null;
export async function adminAuth() {
  if (cachedAdmin) return cachedAdmin;
  const email = process.env.TEST_ADMIN_EMAIL || "admin@masjidmycommunity.org";
  const password = process.env.TEST_ADMIN_PASSWORD || "MasjidMyCommunity@2026";
  const { status, body } = await api("/api/admin/auth/login", { method: "POST", body: { email, password } });
  if (status !== 200) throw new Error(`Admin login failed in test setup: ${body?.message || status}`);
  cachedAdmin = { token: body.token, id: body.user.id };
  return cachedAdmin;
}

export function uniqueMobile() {
  return "9" + Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
}

export function uniqueEmail(tag = "user") {
  return `devtest-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function registerAndVerify(overrides = {}) {
  const mobile = overrides.mobile || uniqueMobile();
  const password = overrides.password || "TestPass123";
  const fullName = overrides.fullName || "DevTest User";
  const reg = await api("/api/users/register", { method: "POST", body: { fullName, mobile, password } });
  if (reg.status !== 201) throw new Error(`Test registration failed: ${reg.body?.message || reg.status}`);
  const verify = await api("/api/users/verify-otp", { method: "POST", body: { userId: reg.body.userId, otp: reg.body.demoOtp } });
  if (verify.status !== 200) throw new Error(`Test OTP verification failed: ${verify.body?.message || verify.status}`);
  return { userId: reg.body.userId, username: reg.body.username, mobile, password, token: verify.body.token };
}

export async function deleteTestUser(userId) {
  if (!userId) return;
  const { token } = await adminAuth();
  await api(`/api/admin/users/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}

export async function deleteTestStaff(staffId) {
  if (!staffId) return;
  const { token } = await adminAuth();
  await api(`/api/admin/staff/${staffId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}
