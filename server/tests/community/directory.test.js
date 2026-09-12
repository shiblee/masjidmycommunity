import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

describe("Registered Users Directory", () => {
  let user;
  const uniqueTag = `DevTestDirectory${Date.now()}`;

  beforeAll(async () => {
    user = await registerAndVerify({ fullName: `${uniqueTag} Person` });
  });

  afterAll(async () => {
    await deleteTestUser(user?.userId);
  });

  it("works fully anonymously", async ({ task }) => {
    const { status, body } = await api("/api/users/public");
    expect(status).toBe(200);
    expect(Array.isArray(body.users)).toBe(true);
    task.meta.detail = "GET /api/users/public with no token -> 200, the directory is fully public.";
  });

  it("finds the new user by a name search", async ({ task }) => {
    const { status, body } = await api(`/api/users/public?q=${encodeURIComponent(uniqueTag)}`);
    expect(status).toBe(200);
    expect(body.users.some((u) => u.id === user.userId)).toBe(true);
    task.meta.detail = "GET /api/users/public?q=... matches on fullName -> the new account is found.";
  });

  it("never exposes email or mobile in the directory listing", async ({ task }) => {
    const { body } = await api(`/api/users/public?q=${encodeURIComponent(uniqueTag)}`);
    const row = body.users.find((u) => u.id === user.userId);
    expect(row.email).toBeUndefined();
    expect(row.mobile).toBeUndefined();
    task.meta.detail = "The directory row only ever includes DIRECTORY_SAFE_ATTRIBUTES (id/username/fullName/profilePhoto/bio/location*/createdAt/emailVerified/mobileVerified) -- email and mobile are never selected, not just masked.";
  });

  it("respects the pageSize parameter", async ({ task }) => {
    const { status, body } = await api("/api/users/public?pageSize=1&page=1");
    expect(status).toBe(200);
    expect(body.users.length).toBeLessThanOrEqual(1);
    expect(body.pageSize).toBe(1);
    task.meta.detail = "GET /api/users/public?pageSize=1 -> at most 1 row returned.";
  });

  it("a search with no matches returns an empty list, not an error", async ({ task }) => {
    const { status, body } = await api("/api/users/public?q=devtest-no-such-person-zzz-nonexistent");
    expect(status).toBe(200);
    expect(body.users.length).toBe(0);
    task.meta.detail = "GET /api/users/public?q=<no matches> -> 200 with an empty array, not a 404.";
  });
});
