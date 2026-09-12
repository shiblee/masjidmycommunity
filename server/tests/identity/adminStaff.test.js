import { describe, it, expect, afterAll } from "vitest";
import { api, adminAuth, uniqueEmail } from "../helpers/testClient.js";

describe("Admin / Staff", () => {
  let staffId = null;
  const email = uniqueEmail("staff");

  afterAll(async () => {
    if (staffId) {
      const { token } = await adminAuth();
      await api(`/api/admin/staff/${staffId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    }
  });

  it("rejects an unauthenticated request to list staff", async ({ task }) => {
    const { status } = await api("/api/admin/staff");
    expect(status).toBe(401);
    task.meta.detail = "GET /api/admin/staff with no token -> 401.";
  });

  it("creates a new staff account with scoped permissions", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api("/api/admin/staff", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { name: "DevTest Staff", email, password: "TestPass123", permissions: { developer: ["view"] } },
    });
    expect(status).toBe(201);
    expect(body.staff.id).toBeTypeOf("number");
    staffId = body.staff.id;
    task.meta.detail = "POST /api/admin/staff with permissions {developer:[view]} -> 201, a real staff row is created.";
  });

  it("rejects creating a second staff account with the same email", async ({ task }) => {
    const { token } = await adminAuth();
    // permissions must be non-empty or this 400s on that validation before
    // ever reaching the duplicate-email check -- match the first creation's
    // shape so this test actually exercises the check it's named for.
    const { status, body } = await api("/api/admin/staff", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { name: "DevTest Staff Dup", email, password: "TestPass123", permissions: { developer: ["view"] } },
    });
    expect(status).toBe(409);
    expect(body.message).toMatch(/already exists/i);
    task.meta.detail = "POST /api/admin/staff again with the same email -> 409 \"already exists\".";
  });

  it("lists the new staff account", async ({ task }) => {
    const { token } = await adminAuth();
    const { body } = await api("/api/admin/staff", { headers: { Authorization: `Bearer ${token}` } });
    expect(body.staff.some((s) => s.id === staffId)).toBe(true);
    task.meta.detail = "GET /api/admin/staff -> the just-created staff id appears in the list.";
  });

  it("updates the staff account's name", async ({ task }) => {
    const { token } = await adminAuth();
    const { status, body } = await api(`/api/admin/staff/${staffId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { name: "DevTest Staff Renamed" },
    });
    expect(status).toBe(200);
    expect(body.staff.name).toBe("DevTest Staff Renamed");
    task.meta.detail = "PATCH /api/admin/staff/:id with a new name -> 200, name updated.";
  });

  it("deactivating the account blocks future login without deleting it", async ({ task }) => {
    const { token } = await adminAuth();
    const { status } = await api(`/api/admin/staff/${staffId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { status: "inactive" },
    });
    expect(status).toBe(200);

    const login = await api("/api/admin/auth/login", { method: "POST", body: { email, password: "TestPass123" } });
    expect(login.status).not.toBe(200);
    task.meta.detail = "PATCH .../status to \"inactive\" -> 200, and that account can no longer log in (but the row still exists).";
  });

  it("refuses to delete a non-staff account (e.g. the super_admin) through this endpoint", async ({ task }) => {
    const { token, id: adminId } = await adminAuth();
    const { status } = await api(`/api/admin/staff/${adminId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(404);
    task.meta.detail = "DELETE /api/admin/staff/:id against the super_admin's own id -> 404 (this endpoint is scoped to role:\"staff\" only).";
  });

  it("hard-deletes the staff account", async ({ task }) => {
    const { token } = await adminAuth();
    const { status } = await api(`/api/admin/staff/${staffId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(204);

    const getAfter = await api(`/api/admin/staff/${staffId}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(getAfter.status).toBe(404);
    staffId = null;
    task.meta.detail = "DELETE /api/admin/staff/:id -> 204, and the account is genuinely gone (a follow-up GET 404s).";
  });
});
