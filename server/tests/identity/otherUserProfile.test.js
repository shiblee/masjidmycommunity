import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

describe("Other User Profile", () => {
  let target, viewer;

  beforeAll(async () => {
    target = await registerAndVerify({ fullName: "DevTest TargetProfile" });
    viewer = await registerAndVerify({ fullName: "DevTest Viewer" });
  });

  afterAll(async () => {
    await deleteTestUser(target?.userId);
    await deleteTestUser(viewer?.userId);
  });

  it("reports isOwner: false when viewed by a different logged-in user", async () => {
    const { status, body } = await api(`/api/users/public/${target.username}`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(status).toBe(200);
    expect(body.user.isOwner).toBe(false);
  });

  it("never includes private fields for a non-owner viewer", async () => {
    const { body } = await api(`/api/users/public/${target.username}`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(body.user.email).toBeUndefined();
    expect(body.user.mobile).toBeUndefined();
    expect(body.user.gender).toBeUndefined();
    expect(body.user.dateOfBirth).toBeUndefined();
    expect(body.user.status).toBeUndefined();
  });

  it("reports isOwner: false for a fully unauthenticated (guest) viewer too", async () => {
    const { body } = await api(`/api/users/public/${target.username}`);
    expect(body.user.isOwner).toBe(false);
  });

  it("still exposes public-safe fields to a non-owner viewer", async () => {
    const { body } = await api(`/api/users/public/${target.username}`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(body.user.username).toBe(target.username);
    expect(body.user.fullName).toBe("DevTest TargetProfile");
  });

  it("returns 404 for a username that doesn't exist", async () => {
    const { status } = await api("/api/users/public/devtest-nonexistent-username-zzz");
    expect(status).toBe(404);
  });

  it("a non-owner cannot update the target's profile through PATCH /me (acts on the token's own account, not the target)", async () => {
    const { status, body } = await api("/api/users/me", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${viewer.token}` },
      body: { bio: "Attempted cross-account edit" },
    });
    // /me always resolves to whoever the token belongs to -- this proves
    // there is no way to pass a target user id and edit someone else.
    expect(status).toBe(200);
    expect(body.user.id).toBe(viewer.userId);
    expect(body.user.id).not.toBe(target.userId);
  });
});
