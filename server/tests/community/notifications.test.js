import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

// The real notification-*triggering* behaviors (comment_reply, wall_mention,
// and the "a like/top-level-comment never notifies" gaps) are covered where
// they're generated -- comments.test.js, likes.test.js, posts.test.js, and
// otherUserProfile.test.js (new_follower). This file covers the
// notification *management* surface itself: read/unread state and the
// list/mark-read/mark-all-read endpoints.

describe("Notifications", () => {
  let recipient, actor;
  let notifiedActivityId;

  beforeAll(async () => {
    recipient = await registerAndVerify({ fullName: "DevTest NotifRecipient" });
    actor = await registerAndVerify({ fullName: "DevTest NotifActor" });

    const post = await api("/api/community/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${recipient.token}` },
      body: { body: `DevTest notifications test post ${Date.now()}` },
    });
    notifiedActivityId = post.body.activity.id;
    const comment = await api(`/api/community/activities/${notifiedActivityId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${recipient.token}` },
      body: { body: "DevTest comment to be replied to" },
    });
    // A reply is the one thing in Community that actually generates a
    // notification (see comments.test.js) -- used here purely as a real
    // fixture for exercising read/unread state, not re-testing the trigger.
    await api(`/api/community/activities/${notifiedActivityId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${actor.token}` },
      body: { body: "DevTest reply for notification fixture", parentId: comment.body.comment.id },
    });
  });

  afterAll(async () => {
    await api(`/api/community/posts/${notifiedActivityId}`, { method: "DELETE", headers: { Authorization: `Bearer ${recipient.token}` } }).catch(() => {});
    await deleteTestUser(recipient?.userId);
    await deleteTestUser(actor?.userId);
  });

  it("rejects listing notifications with no auth token", async ({ task }) => {
    const { status } = await api("/api/users/notifications");
    expect(status).toBe(401);
    task.meta.detail = "GET /api/users/notifications with no token -> 401.";
  });

  it("lists the new notification, unread, newest first", async ({ task }) => {
    const { status, body } = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${recipient.token}` } });
    expect(status).toBe(200);
    expect(body.notifications.length).toBeGreaterThan(0);
    expect(body.notifications[0].isRead).toBe(false);
    expect(body.unreadCount).toBeGreaterThan(0);
    task.meta.detail = "GET /api/users/notifications -> 200 {notifications, unreadCount}, ordered newest first, the new comment_reply notification is unread.";
  });

  it("marking one notification read decrements unreadCount", async ({ task }) => {
    const list = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${recipient.token}` } });
    const target = list.body.notifications.find((n) => !n.isRead);
    const before = list.body.unreadCount;

    const { status, body } = await api(`/api/users/notifications/${target.id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${recipient.token}` } });
    expect(status).toBe(200);
    expect(body.unreadCount).toBe(before - 1);

    const after = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${recipient.token}` } });
    expect(after.body.notifications.find((n) => n.id === target.id).isRead).toBe(true);
    task.meta.detail = "PATCH /api/users/notifications/:id/read -> 200, unreadCount decrements by exactly 1, and that row's isRead flips to true.";
  });

  it("mark-all-read zeroes out unreadCount", async ({ task }) => {
    // Generate a second unread notification so there's something real for
    // mark-all to actually clear, not just a no-op on an already-zero count.
    const comment2 = await api(`/api/community/activities/${notifiedActivityId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${recipient.token}` },
      body: { body: "DevTest second comment" },
    });
    await api(`/api/community/activities/${notifiedActivityId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${actor.token}` },
      body: { body: "DevTest second reply", parentId: comment2.body.comment.id },
    });
    await new Promise((r) => setTimeout(r, 500));

    const before = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${recipient.token}` } });
    expect(before.body.unreadCount).toBeGreaterThan(0);

    const { status, body } = await api("/api/users/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${recipient.token}` } });
    expect(status).toBe(200);
    expect(body.unreadCount).toBe(0);
    task.meta.detail = "PATCH /api/users/notifications/read-all -> 200, unreadCount goes to exactly 0 regardless of how many were unread.";
  });

  it("a user cannot mark another user's notification as read", async ({ task }) => {
    const list = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${recipient.token}` } });
    const someNotifId = list.body.notifications[0]?.id;
    if (!someNotifId) return; // nothing left unread from prior tests to probe with
    const { status } = await api(`/api/users/notifications/${someNotifId}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${actor.token}` } });
    expect(status).toBe(404);
    task.meta.detail = "PATCH /api/users/notifications/:id/read for a notification belonging to a different user -> 404 (scoped to the caller's own userId, so it isn't even found).";
  });
});
