import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, registerAndVerify, deleteTestUser } from "../helpers/testClient.js";

describe("Login / Authentication", () => {
  let account;

  beforeAll(async () => {
    account = await registerAndVerify({ fullName: "DevTest Login" });
  });

  afterAll(async () => {
    await deleteTestUser(account?.userId);
  });

  it("logs in successfully with the correct mobile + password", async ({ task }) => {
    const { status, body } = await api("/api/users/login", {
      method: "POST",
      body: { identifier: account.mobile, password: account.password },
    });
    expect(status).toBe(200);
    expect(body.token).toBeTypeOf("string");
    expect(body.refreshToken).toBeTypeOf("string");
    expect(body.user.id).toBe(account.userId);
    task.meta.detail = "POST /api/users/login with the correct mobile+password -> 200, token+refreshToken for the right user id.";
  });

  it("rejects an incorrect password with the generic credentials message", async ({ task }) => {
    const { status, body } = await api("/api/users/login", {
      method: "POST",
      body: { identifier: account.mobile, password: "WrongPass123" },
    });
    expect(status).toBe(401);
    expect(body.message).toMatch(/invalid credentials/i);
    task.meta.detail = "POST /api/users/login with the wrong password -> 401 \"Invalid credentials\".";
  });

  it("rejects an unknown identifier with the same message (no account enumeration)", async ({ task }) => {
    const { status, body } = await api("/api/users/login", {
      method: "POST",
      body: { identifier: "9999999999", password: "whatever123" },
    });
    expect(status).toBe(401);
    expect(body.message).toMatch(/invalid credentials/i);
    task.meta.detail = "POST /api/users/login with an unregistered mobile -> 401, same generic message as a wrong password (no enumeration).";
  });

  it("issues a new access token from a valid refresh token", async ({ task }) => {
    const login = await api("/api/users/login", {
      method: "POST",
      body: { identifier: account.mobile, password: account.password },
    });
    const { status, body } = await api("/api/users/refresh-token", {
      method: "POST",
      body: { refreshToken: login.body.refreshToken },
    });
    expect(status).toBe(200);
    expect(body.token).toBeTypeOf("string");
    task.meta.detail = "POST /api/users/refresh-token with a real refresh token -> 200, a new access token is issued.";
  });

  it("rejects a bogus refresh token", async ({ task }) => {
    const { status, body } = await api("/api/users/refresh-token", {
      method: "POST",
      body: { refreshToken: "not-a-real-refresh-token" },
    });
    expect(status).toBe(401);
    expect(body.message).toMatch(/session has expired/i);
    task.meta.detail = "POST /api/users/refresh-token with a made-up token -> 401 \"session has expired\".";
  });

  it("blocks login for an account that hasn't verified its OTP yet", async ({ task }) => {
    const unverifiedMobile = `9${Date.now().toString().slice(-9)}`;
    const reg = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest Unverified", mobile: unverifiedMobile, password: "TestPass123" },
    });
    try {
      const { status, body } = await api("/api/users/login", {
        method: "POST",
        body: { identifier: unverifiedMobile, password: "TestPass123" },
      });
      // Real, discovered interaction: login() for a pending_verification
      // account re-issues an OTP (so the user gets a fresh one right from
      // the login screen) -- but registration just issued one seconds ago,
      // so this hits the same resend cooldown a manual "resend code" click
      // would. The account is still correctly blocked either way (403
      // UNVERIFIED once the cooldown has elapsed, 429 COOLDOWN when it
      // hasn't) -- login never succeeds for an unverified account.
      expect([403, 429]).toContain(status);
      if (status === 403) expect(body.code).toBe("UNVERIFIED");
      if (status === 429) expect(body.code).toBe("COOLDOWN");
      task.meta.detail = `POST /api/users/login on a pending_verification account -> blocked, got ${status} (${body.code}); login never succeeds for an unverified account.`;
    } finally {
      await deleteTestUser(reg.body.userId);
    }
  });
});
