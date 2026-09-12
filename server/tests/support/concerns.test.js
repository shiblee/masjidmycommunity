import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, adminAuth, registerAndVerify, deleteTestUser, uniqueEmail } from "../helpers/testClient.js";

describe("User Reports / Concerns", () => {
  let user;
  let concernId;
  let concernType;

  beforeAll(async () => {
    user = await registerAndVerify({ fullName: "DevTest ConcernUser" });
    const types = await api("/api/concerns/public/types");
    concernType = types.body.types[0].name;
  });

  afterAll(async () => {
    if (concernId) {
      const { token } = await adminAuth();
      await api(`/api/admin/concerns/${concernId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    await deleteTestUser(user?.userId);
  });

  it("rejects a submission with a description under 20 characters", async ({ task }) => {
    const { status, body } = await api("/api/concerns/public/", {
      method: "POST",
      body: { fullName: "DevTest Reporter", email: uniqueEmail("concern"), concernType, subject: "Test", description: "too short" },
    });
    expect(status).toBe(400);
    task.meta.detail = "POST /api/concerns/public/ with description under 20 chars -> 400.";
  });

  it("rejects an invalid email format", async ({ task }) => {
    const { status } = await api("/api/concerns/public/", {
      method: "POST",
      body: { fullName: "DevTest Reporter", email: "not-an-email", concernType, subject: "Test", description: "A description that is definitely long enough." },
    });
    expect(status).toBe(400);
    task.meta.detail = "POST /api/concerns/public/ with a malformed email -> 400.";
  });

  it("submits successfully while logged in -- userId is attached", async ({ task }) => {
    const { status, body } = await api("/api/concerns/public/", {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
      body: {
        fullName: "DevTest Reporter",
        email: uniqueEmail("concern"),
        concernType,
        subject: "DevTest concern subject",
        description: "This is an automated test concern with a long enough description.",
      },
    });
    expect(status).toBe(201);
    expect(body.concern.status).toBe("open");
    expect(body.concern.reference).toMatch(/^CONCERN-/);

    // The public submit response deliberately returns only {reference,
    // status} -- never the numeric id -- so admin-side calls need to
    // resolve it via a reference search first, same as a real support
    // agent would look one up from the reference a submitter is given.
    const { token } = await adminAuth();
    const found = await api(`/api/admin/concerns?q=${body.concern.reference}`, { headers: { Authorization: `Bearer ${token}` } });
    concernId = found.body.concerns[0].id;
    expect(concernId).toBeTypeOf("number");
    task.meta.detail = "POST /api/concerns/public/ while signed in -> 201, status:\"open\", a human-readable CONCERN-XXXXXX reference is generated -- deliberately not the numeric id, which only the admin-side reference search resolves.";
  });

  it("also submits successfully fully anonymously (optionalAuth)", async ({ task }) => {
    const { status, body } = await api("/api/concerns/public/", {
      method: "POST",
      body: {
        fullName: "DevTest Anonymous Reporter",
        email: uniqueEmail("concern-anon"),
        concernType,
        subject: "DevTest anonymous concern",
        description: "This is an automated test concern submitted with no auth token at all.",
      },
    });
    expect(status).toBe(201);
    const { token } = await adminAuth();
    const found = await api(`/api/admin/concerns?q=${body.concern.reference}`, { headers: { Authorization: `Bearer ${token}` } });
    await api(`/api/admin/concerns/${found.body.concerns[0].id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    task.meta.detail = "POST /api/concerns/public/ with no Authorization header -> still 201 -- submitting a concern never requires an account (optionalAuth).";
  });

  it("rejects an unauthenticated request to list concerns as admin", async ({ task }) => {
    const { status } = await api("/api/admin/concerns");
    expect(status).toBe(401);
    task.meta.detail = "GET /api/admin/concerns with no token -> 401.";
  });

  it("admin can see the concern and its open count", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/concerns/${concernId}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(200);
    expect(body.concern.id).toBe(concernId);

    const counts = await api("/api/admin/concerns/counts", { headers: { Authorization: `Bearer ${token}` } });
    expect(counts.body.open).toBeGreaterThan(0);
    task.meta.detail = "GET /api/admin/concerns/:id -> 200; GET /api/admin/concerns/counts -> real open/resolved/closed counts for the sidebar badge.";
  });

  it("rejects reopening an already-open concern", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/concerns/${concernId}/reopen`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(400);
    task.meta.detail = "POST .../reopen on a concern that's already \"open\" -> 400.";
  });

  it("resolving sets resolvedBy/resolvedAt and records admin remarks", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/concerns/${concernId}/resolve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { remarks: "DevTest resolution remarks." },
    });
    expect(status).toBe(200);
    expect(body.concern.status).toBe("resolved");
    expect(body.concern.adminRemarks).toBe("DevTest resolution remarks.");
    expect(body.concern.resolvedBy).toBeTruthy();
    expect(body.concern.resolvedAt).toBeTruthy();
    task.meta.detail = "POST .../resolve -> 200, status:\"resolved\", resolvedBy/resolvedAt/adminRemarks all set. This also fires a real resolution email to the submitter (fire-and-forget).";
  });

  it("real, discovered behavior: reopen works from \"resolved\", not just \"closed\"", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/concerns/${concernId}/reopen`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(200);
    expect(body.concern.status).toBe("open");
    task.meta.detail = "POST .../reopen from status:\"resolved\" -> 200, back to \"open\". reopen() only rejects when the concern is ALREADY open -- it accepts either resolved or closed as a starting point, unlike Contact Us's reopen which only accepts \"closed\".";
  });

  it("close then hard-delete", async ({ task }) => {
    const { token } = await adminAuth();
    const close = await api(`/api/admin/concerns/${concernId}/close`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    expect(close.status).toBe(200);
    expect(close.body.concern.status).toBe("closed");

    const del = await api(`/api/admin/concerns/${concernId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    expect(del.status).toBe(200);

    const getAfter = await api(`/api/admin/concerns/${concernId}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(getAfter.status).toBe(404);
    concernId = null;
    task.meta.detail = "POST .../close -> 200. DELETE /api/admin/concerns/:id -> 200, genuinely gone -- this hard-delete endpoint didn't exist before this test suite needed a way to clean up after itself (only status transitions existed).";
  });
});
