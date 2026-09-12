import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  api,
  adminAuth,
  registerAndVerify,
  deleteTestUser,
  deleteTestMasjid,
  testPhotoFormData,
  uniqueMobile,
} from "../helpers/testClient.js";

describe("Masjid", () => {
  let owner, otherUser;
  const masjidIds = [];
  let masjidId;

  beforeAll(async () => {
    owner = await registerAndVerify({ fullName: "DevTest MasjidOwner" });
    otherUser = await registerAndVerify({ fullName: "DevTest MasjidOther" });
  });

  afterAll(async () => {
    for (const id of masjidIds) await deleteTestMasjid(id);
    await deleteTestUser(owner?.userId);
    await deleteTestUser(otherUser?.userId);
  });

  it("rejects creating a masjid with no name", async ({ task }) => {
    const { status, body } = await api("/api/masjids", {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: {},
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/name/i);
    task.meta.detail = "POST /api/masjids with no name -> 400.";
  });

  it("rejects an unauthenticated request to create a masjid", async ({ task }) => {
    const { status } = await api("/api/masjids", { method: "POST", body: { name: "Should Not Be Created" } });
    expect(status).toBe(401);
    task.meta.detail = "POST /api/masjids with no token -> 401.";
  });

  it("creates a masjid draft with just a name", async ({ task }) => {
    const { status, body } = await api("/api/masjids", {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { name: `DevTest Masjid ${Date.now()}` },
    });
    expect(status).toBe(201);
    expect(body.masjid.status).toBe("draft");
    expect(body.masjid.userId).toBe(owner.userId);
    masjidId = body.masjid.id;
    masjidIds.push(masjidId);
    task.meta.detail = "POST /api/masjids with just a name -> 201, status:\"draft\", owned by the creator.";
  });

  it("a non-owner cannot view another user's draft masjid", async ({ task }) => {
    const { status } = await api(`/api/masjids/${masjidId}`, { headers: { Authorization: `Bearer ${otherUser.token}` } });
    expect(status).toBe(404);
    task.meta.detail = "GET /api/masjids/:id as a different user -> 404 (scoped to the owner, not a 403).";
  });

  it("a non-owner cannot update another user's masjid", async ({ task }) => {
    const { status } = await api(`/api/masjids/${masjidId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${otherUser.token}` },
      body: { name: "Hijacked Name" },
    });
    expect(status).toBe(404);
    task.meta.detail = "PATCH /api/masjids/:id as a different user -> 404, no cross-account edits possible.";
  });

  it("rejects clearing the masjid's name to empty", async ({ task }) => {
    const { status } = await api(`/api/masjids/${masjidId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { name: "   " },
    });
    expect(status).toBe(400);
    task.meta.detail = "PATCH with name:\"   \" -> 400, name can't be blanked out.";
  });

  it("lets the owner fill in the required profile fields and coordinates", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/${masjidId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: {
        tagline: "A community masjid for daily prayers.",
        category: "Jama Masjid",
        about: "An automated test masjid used to verify the masjid lifecycle. Not a real masjid.",
        address: "123 Test Road",
        city: "Lucknow",
        country: "India",
        latitude: 26.8467,
        longitude: 80.9462,
      },
    });
    expect(status).toBe(200);
    expect(body.masjid.city).toBe("Lucknow");
    expect(Number(body.masjid.latitude)).toBeCloseTo(26.8467, 3);
    task.meta.detail = "PATCH with tagline/category/about/address/city/country/lat/lng -> 200, all persisted.";
  });

  it("rejects submitting before the required office-bearer contacts are verified", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/${masjidId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/imam|mutawalli|secretary/i);
    task.meta.detail = "POST /submit with no verified office-bearers yet -> 400, names Imam/Mutawalli/Secretary specifically.";
  });

  it("adds and verifies the three required office-bearer contacts", async ({ task }) => {
    for (const designation of ["Imam", "Mutawalli", "Secretary"]) {
      const created = await api(`/api/masjids/${masjidId}/contacts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.token}` },
        body: { designation, name: `DevTest ${designation}`, mobile: uniqueMobile() },
      });
      expect(created.status).toBe(201);
      const contactId = created.body.contact.id;

      const sendOtp = await api(`/api/masjids/${masjidId}/contacts/${contactId}/send-otp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.token}` },
      });
      expect(sendOtp.status).toBe(200);
      expect(sendOtp.body.demoOtp).toMatch(/^\d+$/);

      const confirm = await api(`/api/masjids/${masjidId}/contacts/${contactId}/confirm-otp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${owner.token}` },
        body: { otp: sendOtp.body.demoOtp },
      });
      expect(confirm.status).toBe(200);
      expect(confirm.body.contact.verified).toBe(true);
    }
    task.meta.detail = "Creates Imam/Mutawalli/Secretary contacts, sends a real demo OTP to each, confirms it -> all 3 verified:true.";
  });

  it("rejects submitting with contacts verified but no photo yet", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/${masjidId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/photograph/i);
    task.meta.detail = "POST /submit with contacts verified but 0 photos -> 400, \"Upload at least one photograph\".";
  });

  it("uploads a cover photo", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/${masjidId}/photos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
      formData: testPhotoFormData(),
    });
    expect(status).toBe(201);
    expect(body.photos.length).toBe(1);
    expect(body.photos[0].isCover).toBe(true);
    task.meta.detail = "POST /photos with one PNG -> 201, saved and auto-assigned as the cover photo.";
  });

  it("submits the masjid for review now that every requirement is met", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/${masjidId}/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
    });
    expect(status).toBe(200);
    expect(body.masjid.status).toBe("under_review");
    task.meta.detail = "POST /submit with all requirements met -> 200, status becomes \"under_review\".";
  });

  it("the owner can no longer edit the masjid while it's under review", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/${masjidId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { tagline: "Trying to edit mid-review" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/under review/i);
    task.meta.detail = "PATCH while status:\"under_review\" -> 400, editing is locked until it's approved or changes are requested.";
  });

  it("an unapproved masjid doesn't appear in public search yet", async ({ task }) => {
    const { body } = await api(`/api/masjids/public?q=${encodeURIComponent("DevTest Masjid")}`);
    expect(body.masjids.some((m) => m.id === masjidId)).toBe(false);
    task.meta.detail = "GET /api/masjids/public?q=... while status:\"under_review\" -> the masjid is correctly absent from public search.";
  });

  it("admin approves the masjid", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/masjids/${masjidId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(status).toBe(200);
    expect(body.masjid.status).toBe("approved");
    expect(body.masjid.approvedAt).toBeTruthy();
    task.meta.detail = "POST /api/admin/masjids/:id/approve -> 200, status becomes \"approved\", approvedAt is set.";
  });

  it("the approved masjid now appears in public search by name", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/public?q=${encodeURIComponent("DevTest Masjid")}`);
    expect(status).toBe(200);
    expect(body.masjids.some((m) => m.id === masjidId)).toBe(true);
    task.meta.detail = "GET /api/masjids/public?q=... now that it's approved -> the masjid appears in the results.";
  });

  it("the approved masjid appears in a nearby search around its own coordinates", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/public?lat=26.8467&lng=80.9462`);
    expect(status).toBe(200);
    expect(body.masjids.some((m) => m.id === masjidId)).toBe(true);
    task.meta.detail = "GET /api/masjids/public?lat=&lng= at its own coordinates -> included in the 25km radius filter.";
  });

  it("the full public profile is reachable and shows the persisted fields", async ({ task }) => {
    const { status, body } = await api(`/api/masjids/public/${masjidId}`);
    expect(status).toBe(200);
    expect(body.masjid.city).toBe("Lucknow");
    expect(body.masjid.tagline).toBe("A community masjid for daily prayers.");
    task.meta.detail = "GET /api/masjids/public/:id -> 200, full profile with the fields set earlier.";
  });

  it("rejects an unauthenticated request to update a masjid", async ({ task }) => {
    const { status } = await api(`/api/masjids/${masjidId}`, { method: "PATCH", body: { name: "No Token" } });
    expect(status).toBe(401);
    task.meta.detail = "PATCH /api/masjids/:id with no token -> 401.";
  });
});
