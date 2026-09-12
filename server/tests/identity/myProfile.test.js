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

  it("reports isOwner: true when the owner views their own profile", async () => {
    const { status, body } = await api(`/api/users/public/${account.username}`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(status).toBe(200);
    expect(body.user.isOwner).toBe(true);
  });

  it("includes private fields (mobile, gender) only for the owner", async () => {
    const { body } = await api(`/api/users/public/${account.username}`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(body.user.mobile).toBe(account.mobile);
    expect(body.user).toHaveProperty("gender");
    expect(body.user).toHaveProperty("dateOfBirth");
  });

  it("lets the owner update their own bio via PATCH /me", async () => {
    const { status, body } = await api("/api/users/me", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${account.token}` },
      body: { bio: "DevTest bio update" },
    });
    expect(status).toBe(200);
    expect(body.user.bio).toBe("DevTest bio update");
  });

  it("reflects the update on the public profile immediately afterward", async () => {
    const { body } = await api(`/api/users/public/${account.username}`);
    expect(body.user.bio).toBe("DevTest bio update");
  });

  it("rejects a bio update with no auth token", async () => {
    const { status } = await api("/api/users/me", { method: "PATCH", body: { bio: "Should not save" } });
    expect(status).toBe(401);
  });
});
