// Shared helper for every test in this suite. There is no staging
// environment or test database for this app -- these tests run against
// the real deployed API (override with TEST_BASE_URL for a future
// staging/local target). Every test that creates data is responsible for
// cleaning it up via the delete helpers below, using the same
// self-cleaning pattern already used for manual live verification
// throughout this project's development.
export const BASE_URL = process.env.TEST_BASE_URL || "https://masjidmycommunity.com";

export async function api(path, opts = {}) {
  const { headers, body, formData, ...rest } = opts;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    // A FormData body sets its own multipart Content-Type (with boundary) --
    // must not be overridden with the JSON default.
    headers: formData ? { ...(headers || {}) } : { "Content-Type": "application/json", ...(headers || {}) },
    body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
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

export async function deleteTestMasjid(masjidId) {
  if (!masjidId) return;
  const { token } = await adminAuth();
  await api(`/api/admin/masjids/${masjidId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}

// A minimal valid 1x1 PNG, wrapped as a FormData ready for the masjid photo
// upload endpoint (multipart field name "photos").
const TEST_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
export function testPhotoFormData() {
  const bytes = Buffer.from(TEST_PNG_BASE64, "base64");
  const fd = new FormData();
  fd.append("photos", new Blob([bytes], { type: "image/png" }), "devtest.png");
  return fd;
}

// Drives a masjid all the way from draft to a real "approved" record --
// the only path that exists in the app (there's no admin shortcut that
// skips submission): fill the required fields + coordinates, add and
// verify the three mandatory office-bearer contacts (Imam/Mutawalli/
// Secretary), upload one photo, submit, then approve as admin. Shared by
// both the Masjid and Prayer Times test suites so this real (and
// deliberately not cheap) pipeline only runs once per file, not once per
// test.
export async function createApprovedMasjid(owner, overrides = {}) {
  const name = overrides.name || `DevTest Masjid ${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const latitude = overrides.latitude ?? 26.8467;
  const longitude = overrides.longitude ?? 80.9462;
  const authHeaders = { Authorization: `Bearer ${owner.token}` };

  const create = await api("/api/masjids", { method: "POST", headers: authHeaders, body: { name } });
  if (create.status !== 201) throw new Error(`Test masjid creation failed: ${create.body?.message || create.status}`);
  const masjidId = create.body.masjid.id;

  const patch = await api(`/api/masjids/${masjidId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: {
      tagline: "A community masjid for daily prayers.",
      category: "Jama Masjid",
      about: "An automated test masjid used to verify the masjid and prayer-time lifecycle. Not a real masjid.",
      address: "123 Test Road",
      city: "Lucknow",
      country: "India",
      latitude,
      longitude,
    },
  });
  if (patch.status !== 200) throw new Error(`Test masjid field update failed: ${patch.body?.message || patch.status}`);

  const contactIds = {};
  for (const designation of ["Imam", "Mutawalli", "Secretary"]) {
    const contactCreate = await api(`/api/masjids/${masjidId}/contacts`, {
      method: "POST",
      headers: authHeaders,
      body: { designation, name: `DevTest ${designation}`, mobile: uniqueMobile() },
    });
    if (contactCreate.status !== 201) throw new Error(`Test contact (${designation}) creation failed: ${contactCreate.body?.message}`);
    const contactId = contactCreate.body.contact.id;
    contactIds[designation] = contactId;

    const sendOtp = await api(`/api/masjids/${masjidId}/contacts/${contactId}/send-otp`, { method: "POST", headers: authHeaders });
    if (sendOtp.status !== 200) throw new Error(`Test contact (${designation}) send-otp failed: ${sendOtp.body?.message}`);

    const confirm = await api(`/api/masjids/${masjidId}/contacts/${contactId}/confirm-otp`, {
      method: "POST",
      headers: authHeaders,
      body: { otp: sendOtp.body.demoOtp },
    });
    if (confirm.status !== 200) throw new Error(`Test contact (${designation}) confirm-otp failed: ${confirm.body?.message}`);
  }

  const photoUpload = await api(`/api/masjids/${masjidId}/photos`, { method: "POST", headers: authHeaders, formData: testPhotoFormData() });
  if (photoUpload.status !== 201) throw new Error(`Test masjid photo upload failed: ${photoUpload.body?.message}`);

  const submit = await api(`/api/masjids/${masjidId}/submit`, { method: "POST", headers: authHeaders });
  if (submit.status !== 200) throw new Error(`Test masjid submit failed: ${submit.body?.message}`);

  const { token: adminToken } = await adminAuth();
  const approve = await api(`/api/admin/masjids/${masjidId}/approve`, { method: "POST", headers: { Authorization: `Bearer ${adminToken}` } });
  if (approve.status !== 200) throw new Error(`Test masjid approve failed: ${approve.body?.message}`);

  return { masjidId, name, latitude, longitude, contactIds };
}

function greenTickDocFormData(documentTypeId, representativeId) {
  const bytes = Buffer.from(TEST_PNG_BASE64, "base64");
  const fd = new FormData();
  fd.append("documents", new Blob([bytes], { type: "image/png" }), "devtest-doc.png");
  fd.append("documentTypeId", String(documentTypeId));
  if (representativeId) fd.append("representativeId", String(representativeId));
  fd.append("documentNumber", `DEVTEST-${Date.now()}`);
  return fd;
}

// Real Verification Document Type ids seeded on this platform (Admin Panel
// -> Meta -> Verification Document Types): 1 = Government Photo ID
// (category "representative"), 8 = Masjid Registration Certificate
// (category "masjid"), 12 = Property/Land Ownership Document (category
// "property") -- the three that are currently isRequired:true.
const GREEN_TICK_DOC_TYPES = { representative: 1, masjid: 8, property: 12 };

// Takes an already-approved masjid (see createApprovedMasjid, whose 3
// verified office-bearer contacts double as the Green Tick's required
// representatives) all the way to green_tick_issued -- the only way a
// masjid can create a Campaign, which gates on isGreenTick. Real pipeline,
// not a shortcut: adds each contact as a representative, uploads one
// identity document per representative plus the two required masjid/
// property documents, submits, then has admin approve every
// representative's identity + authorization, approve both documents,
// approve the application, and finally issue the Green Tick.
export async function issueGreenTick(owner, masjid) {
  const authHeaders = { Authorization: `Bearer ${owner.token}` };
  const { token: adminToken } = await adminAuth();
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const repIds = [];
  for (const designation of ["Imam", "Mutawalli", "Secretary"]) {
    const contactPersonId = masjid.contactIds[designation];
    const addRep = await api(`/api/masjids/${masjid.masjidId}/green-tick/representatives`, {
      method: "POST",
      headers: authHeaders,
      body: { contactPersonId },
    });
    if (addRep.status !== 201) throw new Error(`Green Tick representative (${designation}) failed: ${addRep.body?.message}`);
    const repId = addRep.body.representative.id;
    repIds.push(repId);

    const doc = await api(`/api/masjids/${masjid.masjidId}/green-tick/documents`, {
      method: "POST",
      headers: authHeaders,
      formData: greenTickDocFormData(GREEN_TICK_DOC_TYPES.representative, repId),
    });
    if (doc.status !== 201) throw new Error(`Green Tick identity document (${designation}) failed: ${doc.body?.message}`);
  }

  const docIds = [];
  for (const category of ["masjid", "property"]) {
    const doc = await api(`/api/masjids/${masjid.masjidId}/green-tick/documents`, {
      method: "POST",
      headers: authHeaders,
      formData: greenTickDocFormData(GREEN_TICK_DOC_TYPES[category]),
    });
    if (doc.status !== 201) throw new Error(`Green Tick ${category} document failed: ${doc.body?.message}`);
    docIds.push(doc.body.documents[0].id);
  }

  const submit = await api(`/api/masjids/${masjid.masjidId}/green-tick/submit`, { method: "POST", headers: authHeaders, body: { confirmed: true } });
  if (submit.status !== 200) throw new Error(`Green Tick submit failed: ${submit.body?.message}`);

  for (const repId of repIds) {
    const identity = await api(`/api/admin/masjids/${masjid.masjidId}/green-tick/representatives/${repId}/identity`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { decision: "approved" },
    });
    if (identity.status !== 200) throw new Error(`Green Tick identity approval failed: ${identity.body?.message}`);

    const authz = await api(`/api/admin/masjids/${masjid.masjidId}/green-tick/representatives/${repId}/authorization`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { decision: "approved" },
    });
    if (authz.status !== 200) throw new Error(`Green Tick authorization approval failed: ${authz.body?.message}`);
  }

  for (const docId of docIds) {
    const approveDoc = await api(`/api/admin/masjids/${masjid.masjidId}/green-tick/documents/${docId}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: { decision: "approved" },
    });
    if (approveDoc.status !== 200) throw new Error(`Green Tick document approval failed: ${approveDoc.body?.message}`);
  }

  const approveApp = await api(`/api/admin/masjids/${masjid.masjidId}/green-tick/approve`, { method: "POST", headers: adminHeaders });
  if (approveApp.status !== 200) throw new Error(`Green Tick application approval failed: ${approveApp.body?.message}`);

  const issue = await api(`/api/admin/masjids/${masjid.masjidId}/green-tick/issue`, { method: "POST", headers: adminHeaders });
  if (issue.status !== 200) throw new Error(`Green Tick issuance failed: ${issue.body?.message}`);

  return issue.body.application;
}
