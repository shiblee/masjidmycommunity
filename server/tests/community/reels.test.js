import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, adminAuth, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

// A minimal fake "video" upload -- same tiny PNG bytes used elsewhere in
// this suite, just declared with a video mimetype. getVideoDuration() runs
// real ffmpeg against it, fails to find a "Duration:" line in a file
// that isn't a real video container, and returns null -- and the
// duration-cap check is written as `duration != null && duration > 90`,
// so a null duration skips the check entirely rather than rejecting the
// upload. This lets the real create-and-store code path be exercised
// without needing to encode an actual video fixture, but it also means
// this suite can't exercise the >90s REJECTION path -- that would need a
// real, ffprobe/ffmpeg-parseable video file, which is deliberately not
// worth adding as a binary test fixture. Documented here rather than
// silently skipped.
const TEST_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
function fakeVideoFormData(caption) {
  const bytes = Buffer.from(TEST_PNG_BASE64, "base64");
  const fd = new FormData();
  fd.append("video", new Blob([bytes], { type: "video/mp4" }), "devtest.mp4");
  if (caption !== undefined) fd.append("body", caption);
  return fd;
}

describe("Reels", () => {
  let user;
  let reelId;

  beforeAll(async () => {
    user = await registerAndVerify({ fullName: "DevTest ReelsUser" });
  });

  afterAll(async () => {
    await deleteTestUser(user?.userId);
  });

  it("rejects creating a reel with no video file", async ({ task }) => {
    const { status, body } = await api("/api/community/reels", { method: "POST", headers: { Authorization: `Bearer ${user.token}` }, body: {} });
    expect(status).toBe(400);
    expect(body.message).toMatch(/select a video/i);
    task.meta.detail = "POST /api/community/reels with no video field -> 400.";
  });

  it("rejects an unauthenticated request to create a reel", async ({ task }) => {
    const { status } = await api("/api/community/reels", { method: "POST", formData: fakeVideoFormData("x") });
    expect(status).toBe(401);
    task.meta.detail = "POST /api/community/reels with no token -> 401.";
  });

  it("creates a reel with a caption", async ({ task }) => {
    const { status, body } = await api("/api/community/reels", {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
      formData: fakeVideoFormData(`DevTest reel ${Date.now()}`),
    });
    expect(status).toBe(201);
    expect(body.activity.type).toBe("reel");
    expect(body.activity.status).toBe("published");
    reelId = body.activity.id;
    task.meta.detail = "POST /api/community/reels with a video file -> 201, type:\"reel\", auto-published immediately, same as a regular post.";
  });

  it("the reel appears in GET /api/community/reels", async ({ task }) => {
    const { status, body } = await api("/api/community/reels");
    expect(status).toBe(200);
    expect(body.reels.some((a) => a.id === reelId)).toBe(true);
    task.meta.detail = "GET /api/community/reels -> 200, the new reel is listed in its own dedicated feed.";
  });

  it("the reel is excluded from the main Community Wall feed", async ({ task }) => {
    const { body } = await api(`/api/community/activities?userId=${user.userId}&limit=30`);
    expect(body.activities.some((a) => a.id === reelId)).toBe(false);
    task.meta.detail = "GET /api/community/activities (the main feed) never includes type:\"reel\" rows -- listPublished() explicitly excludes them (Op.ne \"reel\"), confirming they're a genuinely separate rail server-side, not just a client-side view of the same feed.";
  });

  it("a reel supports the same comment/vote endpoints as a post, via its shared activityId", async ({ task }) => {
    const vote = await api(`/api/community/activities/${reelId}/vote`, { method: "POST", headers: { Authorization: `Bearer ${user.token}` }, body: { value: "like" } });
    expect(vote.status).toBe(200);
    expect(vote.body.likeCount).toBe(1);

    const comment = await api(`/api/community/activities/${reelId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
      body: { body: "DevTest comment on a reel" },
    });
    expect(comment.status).toBe(201);
    task.meta.detail = "Voting and commenting on a reel use the exact same /api/community/activities/:id/vote and /comments endpoints as a post -- Reels have no vote/comment model of their own, they reuse CommunityActivityVote/Comment via the shared activityId.";
  });

  it("there is no update endpoint for a reel -- only creation and deletion exist", async ({ task }) => {
    const { status } = await api(`/api/community/reels/${reelId}`, { method: "PATCH", headers: { Authorization: `Bearer ${user.token}` }, body: { body: "trying to edit" } });
    expect(status).toBe(404);
    task.meta.detail = "PATCH /api/community/reels/:id -> 404 (route doesn't exist). Unlike a post, a reel can't be edited by its owner at all -- only deleted (DELETE /api/community/reels/:id, with a required reason) or removed outright by an admin (DELETE /api/admin/community/:id).";
  });

  it("rejects a non-owner deleting someone else's reel", async ({ task }) => {
    const other = await registerAndVerify({ fullName: "DevTest ReelsOther" });
    const { status } = await api(`/api/community/reels/${reelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${other.token}` },
      body: { reason: "Wrong video" },
    });
    expect(status).toBe(403);
    await deleteTestUser(other.userId);
    task.meta.detail = "DELETE /api/community/reels/:id from a different user's token -> 403.";
  });

  it("rejects deleting a reel with no reason, or an invalid one", async ({ task }) => {
    const noReason = await api(`/api/community/reels/${reelId}`, { method: "DELETE", headers: { Authorization: `Bearer ${user.token}` }, body: {} });
    expect(noReason.status).toBe(400);

    const badReason = await api(`/api/community/reels/${reelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.token}` },
      body: { reason: "DevTest-Nonexistent-Reason" },
    });
    expect(badReason.status).toBe(400);
    task.meta.detail = "DELETE /api/community/reels/:id with no reason, or one that isn't a real active ReelDeletionReason -> 400 both times -- unlike Contact Us, there's no silent fallback here.";
  });

  it("requires a comment when the reason is \"Other\"", async ({ task }) => {
    const { status, body } = await api(`/api/community/reels/${reelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.token}` },
      body: { reason: "Other" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/describe/i);
    task.meta.detail = "DELETE .../reels/:id with reason:\"Other\" and no comment -> 400, mirroring Masjid's own delete-with-reason rule exactly.";
  });

  it("deletes the reel with a real reason -- it disappears from the public feed but stays on record for admins", async ({ task }) => {
    const del = await api(`/api/community/reels/${reelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.token}` },
      body: { reason: "Wrong video", comment: "" },
    });
    expect(del.status).toBe(200);

    const list = await api("/api/community/reels?limit=50");
    expect(list.body.reels.some((a) => a.id === reelId)).toBe(false);

    const { token: adminToken } = await adminAuth();
    const deletedList = await api("/api/admin/community/deleted-reels?pageSize=50", { headers: { Authorization: `Bearer ${adminToken}` } });
    const found = deletedList.body.reels.find((r) => r.id === reelId);
    expect(found).toBeTruthy();
    expect(found.deletionReason).toBe("Wrong video");
    expect(found.author.id).toBe(user.userId);
    task.meta.detail = "DELETE .../reels/:id -> 200, a soft delete (status:\"deleted\") -- gone from GET /api/community/reels immediately, but listed on GET /api/admin/community/deleted-reels with the real reason and author, not hard-removed the way an admin's own DELETE /api/admin/community/:id is.";
  });

  it("rejects deleting a reel that's already deleted", async ({ task }) => {
    const { status, body } = await api(`/api/community/reels/${reelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.token}` },
      body: { reason: "Wrong video" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/already been deleted/i);
    task.meta.detail = "A second DELETE on an already-deleted reel -> 400.";
  });
});
