import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

describe("My Profile", () => {
  let account;

  beforeAll(async () => {
    account = await registerAndVerify({ fullName: "DevTest MyProfile" });
  });

  afterAll(async () => {
    await deleteTestUser(account?.userId);
  });

  it("reports isOwner: true when the owner views their own profile", async ({ task }) => {
    const { status, body } = await api(`/api/users/public/${account.username}`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(status).toBe(200);
    expect(body.user.isOwner).toBe(true);
    task.meta.detail = "GET /api/users/public/:username with the owner's own token -> 200, isOwner: true.";
  });

  it("includes private fields (mobile, gender) only for the owner", async ({ task }) => {
    const { body } = await api(`/api/users/public/${account.username}`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(body.user.mobile).toBe(account.mobile);
    expect(body.user).toHaveProperty("gender");
    expect(body.user).toHaveProperty("dateOfBirth");
    task.meta.detail = "Owner's own profile response includes mobile, gender and dateOfBirth (owner/admin-only fields).";
  });

  it("lets the owner update their own bio via PATCH /me", async ({ task }) => {
    const { status, body } = await api("/api/users/me", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${account.token}` },
      body: { bio: "DevTest bio update" },
    });
    expect(status).toBe(200);
    expect(body.user.bio).toBe("DevTest bio update");
    task.meta.detail = "PATCH /api/users/me with a new bio -> 200, bio field updated in the response.";
  });

  it("reflects the update on the public profile immediately afterward", async ({ task }) => {
    const { body } = await api(`/api/users/public/${account.username}`);
    expect(body.user.bio).toBe("DevTest bio update");
    task.meta.detail = "A fresh, unauthenticated GET right after the PATCH already shows the new bio -- no caching lag.";
  });

  it("rejects a bio update with no auth token", async ({ task }) => {
    const { status } = await api("/api/users/me", { method: "PATCH", body: { bio: "Should not save" } });
    expect(status).toBe(401);
    task.meta.detail = "PATCH /api/users/me with no Authorization header -> 401, nothing is saved.";
  });
});
