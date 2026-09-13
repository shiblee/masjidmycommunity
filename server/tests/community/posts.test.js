import { describe, it, expect, beforeAll, afterAll } from "vitest";
import sharp from "sharp";
import { api, BASE_URL, registerAndVerify, deleteTestUser, createApprovedMasjid, deleteTestMasjid } from "../helpers/testClient.js";

describe("Posts", () => {
  let author, otherUser, masjidOwner, mentionedMasjid;
  let postId;

  beforeAll(async () => {
    author = await registerAndVerify({ fullName: "DevTest PostAuthor" });
    otherUser = await registerAndVerify({ fullName: "DevTest PostOther" });
    masjidOwner = await registerAndVerify({ fullName: "DevTest PostMasjidOwner" });
    mentionedMasjid = await createApprovedMasjid(masjidOwner, { name: `DevTest Mentioned Masjid ${Date.now()}` });
  }, 60000);

  afterAll(async () => {
    await deleteTestMasjid(mentionedMasjid?.masjidId);
    await deleteTestUser(author?.userId);
    await deleteTestUser(otherUser?.userId);
    await deleteTestUser(masjidOwner?.userId);
  });

  it("rejects a post with neither text nor media", async ({ task }) => {
    const { status, body } = await api("/api/community/posts", { method: "POST", headers: { Authorization: `Bearer ${author.token}` }, body: {} });
    expect(status).toBe(400);
    expect(body.message).toMatch(/write something/i);
    task.meta.detail = "POST /api/community/posts with empty body and no files -> 400.";
  });

  it("rejects an unauthenticated request to create a post", async ({ task }) => {
    const { status } = await api("/api/community/posts", { method: "POST", body: { body: "x" } });
    expect(status).toBe(401);
    task.meta.detail = "POST /api/community/posts with no token -> 401.";
  });

  it("creates a text-only post", async ({ task }) => {
    const { status, body } = await api("/api/community/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: `DevTest post ${Date.now()}` },
    });
    expect(status).toBe(201);
    expect(body.activity.type).toBe("community_post");
    expect(body.activity.status).toBe("published");
    postId = body.activity.id;
    task.meta.detail = "POST /api/community/posts with text only -> 201, type:\"community_post\", auto-published immediately (no moderation queue).";
  });

  it("rejects a post over the configured max length", async ({ task }) => {
    const settings = await api("/api/community/content-settings");
    const tooLong = "x".repeat(settings.body.maxPostLength + 1);
    const { status, body } = await api("/api/community/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: tooLong },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/characters/i);
    task.meta.detail = "POST with body.length > maxPostLength -> 400, using the real configured limit rather than a hardcoded assumption.";
  });

  it("a non-owner cannot edit another user's post", async ({ task }) => {
    const { status } = await api(`/api/community/posts/${postId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${otherUser.token}` },
      body: { body: "Hijacked" },
    });
    expect(status).toBe(403);
    task.meta.detail = "PATCH /api/community/posts/:id as a different user -> 403 (Community uses 404-then-403, not the 404-only pattern Masjid/Campaign/Job use).";
  });

  it("the owner can edit their own post", async ({ task }) => {
    const { status, body } = await api(`/api/community/posts/${postId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: "DevTest post, edited." },
    });
    expect(status).toBe(200);
    expect(body.activity.body).toBe("DevTest post, edited.");
    task.meta.detail = "PATCH /api/community/posts/:id as the owner -> 200, body updated.";
  });

  it("a large uploaded photo is resized/re-compressed and served with a long-lived immutable cache header", async ({ task }) => {
    // Real random-noise pixels, not a solid color -- a flat test color
    // compresses to near-nothing regardless of dimensions, which would
    // make the "did it actually get smaller" assertion meaningless. Noise
    // is closer to a real photo's entropy and scales with pixel count.
    const width = 2400, height = 1800;
    const raw = Buffer.alloc(width * height * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = Math.floor(Math.random() * 256);
    const original = await sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();

    const fd = new FormData();
    fd.append("media", new Blob([original], { type: "image/jpeg" }), "devtest-large.jpg");
    fd.append("body", `DevTest resize check ${Date.now()}`);
    const upload = await api("/api/community/posts", { method: "POST", headers: { Authorization: `Bearer ${author.token}` }, formData: fd });
    expect(upload.status).toBe(201);
    const uploadedId = upload.body.activity.id;
    try {
      const imageUrl = upload.body.activity.images[0]?.url;
      expect(imageUrl).toBeTruthy();

      const fileRes = await fetch(`${BASE_URL}${imageUrl}`);
      expect(fileRes.status).toBe(200);
      expect(fileRes.headers.get("cache-control")).toMatch(/immutable/);
      expect(fileRes.headers.get("cache-control")).toMatch(/max-age=\d+/);

      const downloaded = Buffer.from(await fileRes.arrayBuffer());
      const meta = await sharp(downloaded).metadata();
      expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(1600);
      expect(downloaded.length).toBeLessThan(original.length);
      task.meta.detail = `A real 2400x1800 (${original.length} bytes) JPEG upload comes back resized to <=1600px on its longest side and smaller on disk (${downloaded.length} bytes) -- optimizeImageInPlace() actually runs before the post is created, not just accepted as-is. The served file also carries Cache-Control: max-age=2592000, immutable (Express's express.static maxAge/immutable options) instead of the old default max-age=0.`;
    } finally {
      // Cleanup must run even if an assertion above fails, or a failing
      // run strands a real post+image instead of just reporting a red test.
      await api(`/api/community/posts/${uploadedId}`, { method: "DELETE", headers: { Authorization: `Bearer ${author.token}` } });
    }
  });

  it("mentioning a masjid notifies its owner, but not when mentioning your own masjid", async ({ task }) => {
    const mentionText = `Check out @[masjid:${mentionedMasjid.masjidId}:${mentionedMasjid.name}] this Friday!`;
    const post = await api("/api/community/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${author.token}` },
      body: { body: mentionText },
    });
    expect(post.status).toBe(201);

    await new Promise((r) => setTimeout(r, 800));
    const notifications = await api("/api/users/notifications", { headers: { Authorization: `Bearer ${masjidOwner.token}` } });
    const mentionNotif = notifications.body.notifications.find((n) => n.type === "wall_mention" && n.relatedMasjidId === mentionedMasjid.masjidId);
    expect(mentionNotif).toBeTruthy();

    await api(`/api/community/posts/${post.body.activity.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${author.token}` } });
    task.meta.detail = "A post with an @[masjid:id:name] mention token notifies that masjid's owner (type:\"wall_mention\") -- parsed live from body text via regex, there's no stored mentions column.";
  });

  it("deletes the post -- a real hard delete, not a status flag", async ({ task }) => {
    const { status } = await api(`/api/community/posts/${postId}`, { method: "DELETE", headers: { Authorization: `Bearer ${author.token}` } });
    expect(status).toBe(200);

    const feedCheck = await api(`/api/community/activities?userId=${author.userId}&limit=30`);
    expect(feedCheck.body.activities.some((a) => a.id === postId)).toBe(false);
    task.meta.detail = "DELETE /api/community/posts/:id -> 200, and the row is genuinely gone from the feed (deleteActivityCascade(), unlike Comment's soft delete).";
  });
});
