import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, adminAuth, uniqueEmail } from "../helpers/testClient.js";

// Proves the permission system actually constrains a real request, not
// just that a super_admin bypasses it -- one staff account is given
// exactly one grant (developer:view) and must be both blocked from an
// ungranted module and allowed into the granted one.
describe("Permissions", () => {
  let staffId, staffToken;
  const email = uniqueEmail("perm");

  beforeAll(async () => {
    const { token } = await adminAuth();
    const create = await api("/api/admin/staff", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { name: "DevTest Permissions", email, password: "TestPass123", permissions: { developer: ["view"] } },
    });
    staffId = create.body.staff.id;

    const login = await api("/api/admin/auth/login", { method: "POST", body: { email, password: "TestPass123" } });
    staffToken = login.body.token;
  });

  afterAll(async () => {
    const { token } = await adminAuth();
    if (staffId) await api(`/api/admin/staff/${staffId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  });

  it("logs the staff account in with only its granted permissions", async ({ task }) => {
    expect(staffToken).toBeTypeOf("string");
    task.meta.detail = "A staff account created with permissions {developer:[view]} logs in normally and receives a real JWT.";
  });

  it("blocks the staff account from a module it wasn't granted", async ({ task }) => {
    const { status, body } = await api("/api/admin/staff", { headers: { Authorization: `Bearer ${staffToken}` } });
    expect(status).toBe(403);
    expect(body.message).toMatch(/don't have (permission|access)/i);
    task.meta.detail = "GET /api/admin/staff with a token that only has developer:view -> 403, staff module was never granted.";
  });

  it("allows the staff account into the one module it was granted", async ({ task }) => {
    const { status } = await api("/api/admin/developer/modules", { headers: { Authorization: `Bearer ${staffToken}` } });
    expect(status).toBe(200);
    task.meta.detail = "GET /api/admin/developer/modules with the same token -> 200, developer:view was granted.";
  });

  it("blocks the write action on a module the account can only view (developer:edit was never granted)", async ({ task }) => {
    const { status, body } = await api("/api/admin/developer/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    expect(status).toBe(403);
    expect(body.message).toMatch(/edit/i);
    task.meta.detail = "POST /api/admin/developer/sync (a write action) with a view-only token -> 403 -- view and edit are enforced separately, not just module-level access.";
  });

  it("a super_admin bypasses every permission check regardless of the permissions column", async ({ task }) => {
    const { token } = await adminAuth();
    const { status } = await api("/api/admin/staff", { headers: { Authorization: `Bearer ${token}` } });
    expect(status).toBe(200);
    task.meta.detail = "The same GET /api/admin/staff with a super_admin token -> 200, role:\"super_admin\" bypasses the permissions object entirely.";
  });

  it("rejects a request with no token at all on a permission-gated route", async ({ task }) => {
    const { status } = await api("/api/admin/developer/modules");
    expect(status).toBe(401);
    task.meta.detail = "GET /api/admin/developer/modules with no Authorization header -> 401, before permission checks even run.";
  });
});
