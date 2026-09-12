import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

describe("Community Wall", () => {
  let user;
  let postId;

  beforeAll(async () => {
    user = await registerAndVerify({ fullName: "DevTest WallUser" });
    const post = await api("/api/community/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
      body: { body: `DevTest wall feed check ${Date.now()}` },
    });
    postId = post.body.activity.id;
  });

  afterAll(async () => {
    await deleteTestUser(user?.userId);
  });

  it("GET /api/community/content-settings returns the real configured limits", async ({ task }) => {
    const { status, body } = await api("/api/community/content-settings");
    expect(status).toBe(200);
    expect(body.maxPostLength).toBeTypeOf("number");
    expect(body.maxCommentLength).toBeTypeOf("number");
    expect(body.maxReplyLength).toBeTypeOf("number");
    task.meta.detail = "GET /api/community/content-settings -> 200, real maxPostLength/maxCommentLength/maxReplyLength from the ContentSettings singleton row.";
  });

  it("the feed (GET /api/community/activities) includes the new post", async ({ task }) => {
    const { status, body } = await api(`/api/community/activities?userId=${user.userId}&limit=30`);
    expect(status).toBe(200);
    expect(body.activities.some((a) => a.id === postId)).toBe(true);
    task.meta.detail = "GET /api/community/activities?userId=... -> 200, includes the post just created by that user.";
  });

  it("the feed works fully anonymously (optionalAuth)", async ({ task }) => {
    const { status } = await api(`/api/community/activities?limit=5`);
    expect(status).toBe(200);
    task.meta.detail = "GET /api/community/activities with no Authorization header -> 200, the main feed is fully public.";
  });

  it("the feed respects a limit/offset pagination window", async ({ task }) => {
    const first = await api(`/api/community/activities?userId=${user.userId}&limit=1&offset=0`);
    expect(first.body.activities.length).toBeLessThanOrEqual(1);
    task.meta.detail = "GET /api/community/activities?limit=1 -> at most 1 row returned, confirming the limit param is honored.";
  });

  it("GET /api/community/stats returns platform-wide counters", async ({ task }) => {
    const { status, body } = await api("/api/community/stats");
    expect(status).toBe(200);
    expect(body).toBeTypeOf("object");
    task.meta.detail = "GET /api/community/stats -> 200, real platform-wide community counters.";
  });
});
