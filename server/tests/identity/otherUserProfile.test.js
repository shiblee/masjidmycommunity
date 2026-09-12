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

  it("reports isOwner: false when viewed by a different logged-in user", async ({ task }) => {
    const { status, body } = await api(`/api/users/public/${target.username}`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(status).toBe(200);
    expect(body.user.isOwner).toBe(false);
    task.meta.detail = "GET /api/users/public/:username with a different user's token -> 200, isOwner: false.";
  });

  it("never includes private fields for a non-owner viewer", async ({ task }) => {
    const { body } = await api(`/api/users/public/${target.username}`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(body.user.email).toBeUndefined();
    expect(body.user.mobile).toBeUndefined();
    expect(body.user.gender).toBeUndefined();
    expect(body.user.dateOfBirth).toBeUndefined();
    expect(body.user.status).toBeUndefined();
    task.meta.detail = "Non-owner response omits email, mobile, gender, dateOfBirth and status entirely (not masked -- absent).";
  });

  it("reports isOwner: false for a fully unauthenticated (guest) viewer too", async ({ task }) => {
    const { body } = await api(`/api/users/public/${target.username}`);
    expect(body.user.isOwner).toBe(false);
    task.meta.detail = "Same GET with no Authorization header at all -> isOwner: false, works fully anonymously.";
  });

  it("still exposes public-safe fields to a non-owner viewer", async ({ task }) => {
    const { body } = await api(`/api/users/public/${target.username}`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(body.user.username).toBe(target.username);
    expect(body.user.fullName).toBe("DevTest TargetProfile");
    task.meta.detail = "Non-owner still sees username and fullName -- the public-safe fields stay visible.";
  });

  it("returns 404 for a username that doesn't exist", async ({ task }) => {
    const { status } = await api("/api/users/public/devtest-nonexistent-username-zzz");
    expect(status).toBe(404);
    task.meta.detail = "GET /api/users/public/<made-up username> -> 404.";
  });

  it("a non-owner cannot update the target's profile through PATCH /me (acts on the token's own account, not the target)", async ({ task }) => {
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
    task.meta.detail = "PATCH /api/users/me with the viewer's token -> always edits the token's own account (viewer), never the target -- there's no target-id parameter to abuse.";
  });

  // --- Follow / Following -----------------------------------------------
  // Exercised in sequence against the same target/viewer pair: follow,
  // reject self-follow, check the reciprocal isFollowing/isFollowedBy view
  // from both sides, list endpoints, then unfollow and clean up.

  it("follows another user and increments their followersCount", async ({ task }) => {
    const { status, body } = await api(`/api/users/${target.userId}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(status).toBe(200);
    expect(body.following).toBe(true);

    const profile = await api(`/api/users/public/${target.username}`);
    expect(profile.body.user.followersCount).toBe(1);
    task.meta.detail = "POST /api/users/:targetId/follow -> 200 following:true, and the target's public followersCount becomes 1.";
  });

  it("prevents a user from following themselves", async ({ task }) => {
    const { status, body } = await api(`/api/users/${viewer.userId}/follow`, {
      method: "POST",
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/yourself/i);
    task.meta.detail = "POST /api/users/:ownId/follow with your own id -> 400 \"You can't follow yourself.\"";
  });

  it("reflects isFollowing/isFollowedBy correctly on both sides of the relationship", async ({ task }) => {
    const targetSeenByViewer = await api(`/api/users/public/${target.username}`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(targetSeenByViewer.body.user.isFollowing).toBe(true);
    expect(targetSeenByViewer.body.user.isFollowedBy).toBe(false);

    const viewerSeenByTarget = await api(`/api/users/public/${viewer.username}`, {
      headers: { Authorization: `Bearer ${target.token}` },
    });
    expect(viewerSeenByTarget.body.user.isFollowing).toBe(false);
    expect(viewerSeenByTarget.body.user.isFollowedBy).toBe(true);
    task.meta.detail = "Target's profile (seen by viewer): isFollowing true / isFollowedBy false. Viewer's profile (seen by target): isFollowing false / isFollowedBy true -- the \"Follows you\" badge case.";
  });

  it("lists the viewer in the target's followers list", async ({ task }) => {
    const { status, body } = await api(`/api/users/${target.userId}/followers`);
    expect(status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.users[0].id).toBe(viewer.userId);
    task.meta.detail = "GET /api/users/:targetId/followers (anonymous) -> total:1, the one row is the viewer who just followed.";
  });

  it("lists the target in the viewer's own following list, with isFollowing:true per row", async ({ task }) => {
    const { status, body } = await api(`/api/users/${viewer.userId}/following`, {
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.users[0].id).toBe(target.userId);
    expect(body.users[0].isFollowing).toBe(true);
    task.meta.detail = "GET /api/users/:viewerId/following as the viewer -> total:1, row is the target, and its isFollowing flag is correctly true.";
  });

  it("returns 404 when trying to follow a user id that doesn't exist", async ({ task }) => {
    const { status } = await api("/api/users/999999999/follow", {
      method: "POST",
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(status).toBe(404);
    task.meta.detail = "POST /api/users/999999999/follow (id doesn't exist) -> 404.";
  });

  it("unfollowing removes the relationship and decrements the count", async ({ task }) => {
    const { status, body } = await api(`/api/users/${target.userId}/follow`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${viewer.token}` },
    });
    expect(status).toBe(200);
    expect(body.following).toBe(false);

    const profile = await api(`/api/users/public/${target.username}`);
    expect(profile.body.user.followersCount).toBe(0);
    task.meta.detail = "DELETE /api/users/:targetId/follow -> 200 following:false, and the target's followersCount drops back to 0.";
  });
});
