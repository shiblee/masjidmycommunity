import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  api,
  adminAuth,
  registerAndVerify,
  deleteTestUser,
  deleteTestMasjid,
  createApprovedMasjid,
  issueGreenTick,
  testPhotoFormData,
} from "../helpers/testClient.js";

describe("Campaigns / Fundraising", () => {
  let owner, otherUser, plainMasjid, greenTickMasjid;
  let campaignId, campaignSlug;

  beforeAll(async () => {
    owner = await registerAndVerify({ fullName: "DevTest CampaignOwner" });
    otherUser = await registerAndVerify({ fullName: "DevTest CampaignOther" });
    // Two masjids: one approved-only (proves the Green Tick gate really
    // blocks campaign creation), one taken all the way to green_tick_issued
    // (the only masjid state that can actually own a campaign).
    plainMasjid = await createApprovedMasjid(owner, { name: `DevTest Plain Masjid ${Date.now()}` });
    greenTickMasjid = await createApprovedMasjid(owner, { name: `DevTest GreenTick Masjid ${Date.now()}`, latitude: 21.1702, longitude: 72.8311 });
    await issueGreenTick(owner, greenTickMasjid);
  }, 90000);

  afterAll(async () => {
    const { token } = await adminAuth();
    if (campaignId) await api(`/api/admin/campaigns/${campaignId}/delete`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    await deleteTestMasjid(plainMasjid?.masjidId);
    await deleteTestMasjid(greenTickMasjid?.masjidId);
    await deleteTestUser(owner?.userId);
    await deleteTestUser(otherUser?.userId);
  }, 30000);

  it("rejects creating a campaign on an approved masjid that isn't Green Tick verified", async ({ task }) => {
    const { status, body } = await api("/api/campaigns", {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { masjidId: plainMasjid.masjidId, title: "Should Be Blocked" },
    });
    expect(status).toBe(400);
    task.meta.detail = "POST /api/campaigns on an approved-but-not-Green-Tick masjid -> 400. Real prerequisite: creation requires masjid.status===\"approved\" AND isGreenTick===true, not just approval.";
  });

  it("rejects creating a campaign with no title", async ({ task }) => {
    const { status, body } = await api("/api/campaigns", {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { masjidId: greenTickMasjid.masjidId },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/title/i);
    task.meta.detail = "POST /api/campaigns on a Green-Tick masjid but no title -> 400.";
  });

  it("rejects an unauthenticated request to create a campaign", async ({ task }) => {
    const { status } = await api("/api/campaigns", { method: "POST", body: { masjidId: greenTickMasjid.masjidId, title: "x" } });
    expect(status).toBe(401);
    task.meta.detail = "POST /api/campaigns with no token -> 401.";
  });

  it("creates a campaign draft on the Green Tick verified masjid", async ({ task }) => {
    const { status, body } = await api("/api/campaigns", {
      method: "POST",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { masjidId: greenTickMasjid.masjidId, title: `DevTest Campaign ${Date.now()}` },
    });
    expect(status).toBe(201);
    expect(body.campaign.status).toBe("draft");
    campaignId = body.campaign.id;
    campaignSlug = body.campaign.slug;
    task.meta.detail = "POST /api/campaigns on a Green-Tick masjid -> 201, status:\"draft\".";
  });

  it("a non-owner cannot update another user's draft campaign", async ({ task }) => {
    const { status } = await api(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${otherUser.token}` },
      body: { title: "Hijacked" },
    });
    expect(status).toBe(404);
    task.meta.detail = "PATCH /api/campaigns/:id as a different user -> 404.";
  });

  it("rejects a donation to a campaign that isn't live yet", async ({ task }) => {
    const { status, body } = await api(`/api/campaigns/public/${campaignSlug}/donations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${otherUser.token}` },
      body: { amount: 100, method: "upi", isAnonymous: false },
    });
    expect(status).toBe(404);
    task.meta.detail = "POST .../donations on a status:\"draft\" campaign -> 404 (the public donate endpoint only resolves live-status campaigns by slug at all).";
  });

  it("rejects submitting before the required fields are filled in", async ({ task }) => {
    const { status, body } = await api(`/api/campaigns/${campaignId}/submit`, { method: "POST", headers: { Authorization: `Bearer ${owner.token}` } });
    expect(status).toBe(400);
    task.meta.detail = "POST /submit on a bare draft (no shortDescription/description/goalAmount) -> 400.";
  });

  it("lets the owner fill in the required campaign fields", async ({ task }) => {
    const { status, body } = await api(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: {
        shortDescription: "A test fundraiser for automated testing.",
        description: "This is an automated test campaign used to verify the campaign lifecycle. It is not a real fundraiser.",
        goalAmount: 50000,
      },
    });
    expect(status).toBe(200);
    expect(Number(body.campaign.goalAmount)).toBe(50000);
    task.meta.detail = "PATCH with shortDescription/description/goalAmount -> 200, all persisted (donationType stays the default \"General Sadaqah\").";
  });

  it("rejects setting donationType to Zakat with no eligibility note -- validated on save, not just at submit", async ({ task }) => {
    const { status, body } = await api(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { donationType: "Zakat" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/zakat/i);
    task.meta.detail = "PATCH {donationType:\"Zakat\"} alone -> 400 immediately, before submit is ever attempted. Real, discovered behavior: update() enforces this eagerly on every save, not only submit().";
  });

  it("rejects submitting with the eligibility note set but still no photo", async ({ task }) => {
    const patch = await api(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { donationType: "Zakat", zakatEligibilityNote: "100% of funds go directly to eligible recipients per Zakat guidelines." },
    });
    expect(patch.status).toBe(200);

    const { status, body } = await api(`/api/campaigns/${campaignId}/submit`, { method: "POST", headers: { Authorization: `Bearer ${owner.token}` } });
    expect(status).toBe(400);
    expect(body.message).toMatch(/photograph/i);
    task.meta.detail = "PATCH donationType+zakatEligibilityNote together -> 200 (both set at once satisfies the eager check). POST /submit with 0 photos still -> 400, \"Upload at least one photograph before submitting.\"";
  });

  it("submits the campaign for review once every requirement is met", async ({ task }) => {
    const photo = await api(`/api/campaigns/${campaignId}/photos`, { method: "POST", headers: { Authorization: `Bearer ${owner.token}` }, formData: testPhotoFormData() });
    expect(photo.status).toBe(201);

    const { status, body } = await api(`/api/campaigns/${campaignId}/submit`, { method: "POST", headers: { Authorization: `Bearer ${owner.token}` } });
    expect(status).toBe(200);
    expect(body.campaign.status).toBe("under_review");
    task.meta.detail = "POST /submit with all requirements met -> 200, status:\"under_review\" (the \"submitted\" enum value is never actually assigned).";
  });

  it("an under-review campaign doesn't appear in public search yet", async ({ task }) => {
    const { body } = await api(`/api/campaigns/public?q=${encodeURIComponent("DevTest Campaign")}`);
    expect(body.campaigns.some((c) => c.id === campaignId)).toBe(false);
    task.meta.detail = "GET /api/campaigns/public?q=... while status:\"under_review\" -> correctly absent.";
  });

  it("admin approves the campaign -- it goes straight to \"active\", not \"approved\"", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/campaigns/${campaignId}/approve`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(200);
    expect(body.campaign.status).toBe("active");
    task.meta.detail = "POST /api/admin/campaigns/:id/approve -> 200, status:\"active\" directly. \"approved\" is a defined enum value the real flow never actually lands on.";
  });

  it("the active campaign now appears in public search", async ({ task }) => {
    const { status, body } = await api(`/api/campaigns/public?q=${encodeURIComponent("DevTest Campaign")}`);
    expect(status).toBe(200);
    expect(body.campaigns.some((c) => c.id === campaignId)).toBe(true);
    task.meta.detail = "GET /api/campaigns/public?q=... now that it's active -> the campaign appears.";
  });

  it("editing a core field on the live campaign forces it back to under_review", async ({ task }) => {
    const { status, body } = await api(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${owner.token}` },
      body: { goalAmount: 75000 },
    });
    expect(status).toBe(200);
    expect(body.campaign.status).toBe("under_review");
    task.meta.detail = "PATCH goalAmount on a status:\"active\" campaign -> 200, but status is forced back to \"under_review\" -- a material-change re-review gate, same pattern as Masjid's.";
  });

  it("re-approving after the material-change re-review puts it back to active", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/campaigns/${campaignId}/approve`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(200);
    expect(body.campaign.status).toBe("active");
    task.meta.detail = "Re-approving after the goalAmount edit -> back to \"active\".";
  });

  it("admin can pause and resume the campaign", async ({ task }) => {
    const { token } = await adminAuth();
    const pause = await api(`/api/admin/campaigns/${campaignId}/pause`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(pause.status).toBe(200);
    expect(pause.body.campaign.status).toBe("paused");

    const resume = await api(`/api/admin/campaigns/${campaignId}/resume`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(resume.status).toBe(200);
    expect(resume.body.campaign.status).toBe("active");
    task.meta.detail = "POST .../pause -> \"paused\"; POST .../resume -> back to \"active\".";
  });

  it("rejects a donation with no auth token", async ({ task }) => {
    const { status } = await api(`/api/campaigns/public/${campaignSlug}/donations`, { method: "POST", body: { amount: 100, method: "upi" } });
    expect(status).toBe(401);
    task.meta.detail = "POST .../donations with no token -> 401 (donating requires sign-in; no guest donations).";
  });

  it("admin can mark the campaign completed", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/campaigns/${campaignId}/complete`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(200);
    expect(body.campaign.status).toBe("completed");
    task.meta.detail = "POST /api/admin/campaigns/:id/complete -> 200, status:\"completed\".";
  });

  it("hard-deletes the campaign now that it has zero recorded donations", async ({ task }) => {
    const { token } = await adminAuth();
    const { status } = await api(`/api/admin/campaigns/${campaignId}/delete`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(200);
    campaignId = null;
    task.meta.detail = "POST /api/admin/campaigns/:id/delete -> 200. Note: this endpoint is permanently blocked (409) the moment a campaign has ANY recorded donation, and no code path anywhere ever destroys a Donation row -- a real successful donation is intentionally not exercised in this suite, since doing so would make this campaign (and its masjid and owner) permanently undeletable, breaking self-cleaning.";
  });
});
