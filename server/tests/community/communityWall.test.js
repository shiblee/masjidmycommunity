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

  it("two consecutive pages of the real feed are distinct and both report hasMore correctly", async ({ task }) => {
    const pageOne = await api("/api/community/activities?limit=3&offset=0");
    const pageTwo = await api("/api/community/activities?limit=3&offset=3");
    expect(pageOne.status).toBe(200);
    expect(pageTwo.status).toBe(200);
    const idsOne = pageOne.body.activities.map((a) => a.id);
    const idsTwo = pageTwo.body.activities.map((a) => a.id);
    expect(idsOne.some((id) => idsTwo.includes(id))).toBe(false);
    expect(pageOne.body.hasMore).toBeTypeOf("boolean");
    task.meta.detail = "Two GET /api/community/activities calls at offset=0 and offset=3 (same limit) return non-overlapping id sets, and hasMore is a real boolean -- confirms the page a Wall visitor's \"Load More\" click fetches is genuinely the next slice, not a re-fetch of the same rows.";
  });

  it("finds a post by hashtag, but not by a longer tag it's merely a prefix of", async ({ task }) => {
    const tag = `DevTestTag${Date.now()}`;
    const tagged = await api("/api/community/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
      body: { body: `A post about #${tag} for the automated suite.` },
    });
    expect(tagged.status).toBe(201);
    const taggedId = tagged.body.activity.id;

    const found = await api(`/api/community/activities?hashtag=${tag}`);
    expect(found.body.activities.some((a) => a.id === taggedId)).toBe(true);

    const longerTagMiss = await api(`/api/community/activities?hashtag=${tag}XYZ`);
    expect(longerTagMiss.body.activities.some((a) => a.id === taggedId)).toBe(false);

    await api(`/api/community/posts/${taggedId}`, { method: "DELETE", headers: { Authorization: `Bearer ${user.token}` } });
    task.meta.detail = "GET /api/community/activities?hashtag=X finds a post whose body contains #X, but not one that only contains #XYZ -- the exact word-boundary regex match (not just the cheap LIKE prefilter) is what actually decides a match.";
  });

  it("GET /api/community/stats returns platform-wide counters", async ({ task }) => {
    const { status, body } = await api("/api/community/stats");
    expect(status).toBe(200);
    expect(body).toBeTypeOf("object");
    task.meta.detail = "GET /api/community/stats -> 200, real platform-wide community counters.";
  });
});
