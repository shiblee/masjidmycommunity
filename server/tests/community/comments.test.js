import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

describe("Comments & Replies", () => {
  let author, commenter;
  let postId, commentId, replyId;

  beforeAll(async () => {
    author = await registerAndVerify({ fullName: "DevTest CommentPostAuthor" });
    commenter = await registerAndVerify({ fullName: "DevTest Commenter" });
    const post = await api("/api/community/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: `DevTest comments test post ${Date.now()}` },
    });
    postId = post.body.activity.id;
  });

  afterAll(async () => {
    await deleteTestUser(author?.userId);
    await deleteTestUser(commenter?.userId);
  });

  it("rejects an empty comment", async ({ task }) => {
    const { status, body } = await api(`/api/community/activities/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${commenter.token}` },
      body: { body: "" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/empty/i);
    task.meta.detail = "POST .../comments with an empty body -> 400.";
  });

  it("a top-level comment on someone's post does NOT notify the post's author", async ({ task }) => {
    const before = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${author.token}` } });
    const beforeCount = before.body.unreadCount;

    const comment = await api(`/api/community/activities/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${commenter.token}` },
      body: { body: "DevTest top-level comment" },
    });
    expect(comment.status).toBe(201);
    commentId = comment.body.comment.id;

    await new Promise((r) => setTimeout(r, 500));
    const after = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${author.token}` } });
    expect(after.body.unreadCount).toBe(beforeCount);
    task.meta.detail = "Real, discovered behavior: notifyReply() only fires `if (parent)` -- a fresh top-level comment on your own post never notifies you. Only a REPLY to a comment does (see next test).";
  });

  it("a reply to a comment DOES notify that comment's author", async ({ task }) => {
    const before = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${commenter.token}` } });
    const beforeCount = before.body.unreadCount;

    const reply = await api(`/api/community/activities/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: "DevTest reply to your comment", parentId: commentId },
    });
    expect(reply.status).toBe(201);
    expect(reply.body.comment.parentId).toBe(commentId);
    replyId = reply.body.comment.id;

    await new Promise((r) => setTimeout(r, 500));
    const after = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${commenter.token}` } });
    expect(after.body.unreadCount).toBe(beforeCount + 1);
    const notif = after.body.notifications.find((n) => n.type === "comment_reply");
    expect(notif).toBeTruthy();
    task.meta.detail = "POST a comment with parentId set -> 201, parentId persisted, and the parent comment's author gets a real \"comment_reply\" notification.";
  });

  it("threading has no fixed depth limit -- a reply to a reply works", async ({ task }) => {
    const { status, body } = await api(`/api/community/activities/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${commenter.token}` },
      body: { body: "DevTest reply to a reply", parentId: replyId },
    });
    expect(status).toBe(201);
    expect(body.comment.parentId).toBe(replyId);
    task.meta.detail = "A reply to a reply (parentId pointing at a comment that is itself a reply) -> 201. parentId is a plain self-reference with no depth cap.";
  });

  it("a non-owner cannot edit another user's comment", async ({ task }) => {
    const { status } = await api(`/api/community/activities/${postId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: "Hijacked" },
    });
    expect(status).toBe(403);
    task.meta.detail = "PATCH .../comments/:id as a different user -> 403.";
  });

  it("the owner can edit their own comment", async ({ task }) => {
    const { status, body } = await api(`/api/community/activities/${postId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${commenter.token}` },
      body: { body: "DevTest comment, edited." },
    });
    expect(status).toBe(200);
    expect(body.comment.edited).toBe(true);
    task.meta.detail = "PATCH .../comments/:id as the owner -> 200, edited:true in the response (there's no stored editedAt column -- \"edited\" is just this response flag).";
  });

  it("rejects a comment over the configured max length", async ({ task }) => {
    const settings = await api("/api/community/content-settings");
    const tooLong = "x".repeat(settings.body.maxCommentLength + 1);
    const { status } = await api(`/api/community/activities/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${commenter.token}` },
      body: { body: tooLong },
    });
    expect(status).toBe(400);
    task.meta.detail = "POST a comment longer than maxCommentLength -> 400.";
  });

  it("deleting a comment soft-deletes it -- the row stays as a placeholder for its replies", async ({ task }) => {
    const { status } = await api(`/api/community/activities/${postId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${commenter.token}` },
    });
    expect(status).toBe(200);

    const list = await api(`/api/community/activities/${postId}/comments`);
    const deleted = list.body.comments.find((c) => c.id === commentId);
    // Real behavior: soft delete (status:"deleted", body:"") -- unlike a
    // post's hard delete, the row is kept so replies underneath it stay
    // attached to a real thread position instead of becoming orphaned.
    // listComments() only excludes status:"hidden", not "deleted", so the
    // placeholder row is still visible in the thread -- the API response
    // masks its body as null (the DB row itself stores "", but the
    // serializer maps status:"deleted" -> body: null for any reader).
    expect(deleted).toBeTruthy();
    expect(deleted.status).toBe("deleted");
    expect(deleted.body).toBeNull();
    task.meta.detail = "DELETE .../comments/:id -> 200, but the comment row is kept (status:\"deleted\", body:\"\") rather than removed -- deliberately different from a post's hard delete, so the reply thread underneath it doesn't break.";
  });
});
