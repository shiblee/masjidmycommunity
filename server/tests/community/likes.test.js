import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

describe("Likes / Engagement", () => {
  let author, voter;
  let postId, commentId;

  beforeAll(async () => {
    author = await registerAndVerify({ fullName: "DevTest LikesAuthor" });
    voter = await registerAndVerify({ fullName: "DevTest LikesVoter" });
    const post = await api("/api/community/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: `DevTest likes test post ${Date.now()}` },
    });
    postId = post.body.activity.id;
    const comment = await api(`/api/community/activities/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: "DevTest comment to vote on" },
    });
    commentId = comment.body.comment.id;
  });

  afterAll(async () => {
    await deleteTestUser(author?.userId);
    await deleteTestUser(voter?.userId);
  });

  it("rejects voting with no auth token", async ({ task }) => {
    const { status } = await api(`/api/community/activities/${postId}/vote`, { method: "POST", body: { value: "like" } });
    expect(status).toBe(401);
    task.meta.detail = "POST .../vote with no token -> 401.";
  });

  it("rejects an invalid vote value", async ({ task }) => {
    const { status, body } = await api(`/api/community/activities/${postId}/vote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${voter.token}` },
      body: { value: "super-like" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/invalid/i);
    task.meta.detail = "POST .../vote with an unrecognized value -> 400. Votes are like/dislike only, not an arbitrary reaction set.";
  });

  it("liking a post increments its live like count", async ({ task }) => {
    const vote = await api(`/api/community/activities/${postId}/vote`, { method: "POST", headers: { Authorization: `Bearer ${voter.token}` }, body: { value: "like" } });
    expect(vote.status).toBe(200);
    expect(vote.body.likeCount).toBe(1);
    expect(vote.body.userVote).toBe("like");
    task.meta.detail = "POST .../vote {value:\"like\"} -> 200 {likeCount, dislikeCount, userVote} -- a live COUNT query, not a denormalized column.";
  });

  it("switching to dislike moves the count, it doesn't just add a second vote", async ({ task }) => {
    const vote = await api(`/api/community/activities/${postId}/vote`, { method: "POST", headers: { Authorization: `Bearer ${voter.token}` }, body: { value: "dislike" } });
    expect(vote.status).toBe(200);
    expect(vote.body.likeCount).toBe(0);
    expect(vote.body.dislikeCount).toBe(1);
    expect(vote.body.userVote).toBe("dislike");
    task.meta.detail = "Voting \"dislike\" after already having voted \"like\" -> the like is replaced, not duplicated (unique per activityId+userId).";
  });

  it("voting the same value again toggles the vote off", async ({ task }) => {
    const vote = await api(`/api/community/activities/${postId}/vote`, { method: "POST", headers: { Authorization: `Bearer ${voter.token}` }, body: { value: "dislike" } });
    expect(vote.status).toBe(200);
    expect(vote.body.dislikeCount).toBe(0);
    expect(vote.body.userVote).toBeNull();
    task.meta.detail = "Voting \"dislike\" a second time in a row -> the vote is removed entirely (toggle-off), not left in place.";
  });

  it("can vote on a comment independently of the post", async ({ task }) => {
    const vote = await api(`/api/community/activities/${postId}/comments/${commentId}/vote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${voter.token}` },
      body: { value: "like" },
    });
    expect(vote.status).toBe(200);
    expect(vote.body.likeCount).toBe(1);
    expect(vote.body.userVote).toBe("like");
    task.meta.detail = "POST .../comments/:id/vote -> 200, a comment has its own independent like/dislike count from the post it's on.";
  });

  it("liking a post does not notify its author", async ({ task }) => {
    const before = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${author.token}` } });
    await api(`/api/community/activities/${postId}/vote`, { method: "POST", headers: { Authorization: `Bearer ${voter.token}` }, body: { value: "like" } });
    await new Promise((r) => setTimeout(r, 500));
    const after = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${author.token}` } });
    expect(after.body.unreadCount).toBe(before.body.unreadCount);
    task.meta.detail = "Real, discovered behavior: no notifyUser() call exists anywhere near castVote/castCommentVote/castImageVote -- liking a post or comment never generates a notification for its author, unlike a reply.";
  });
});
