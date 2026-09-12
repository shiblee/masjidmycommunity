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

  it("logs in successfully with the correct mobile + password", async () => {
    const { status, body } = await api("/api/users/login", {
      method: "POST",
      body: { identifier: account.mobile, password: account.password },
    });
    expect(status).toBe(200);
    expect(body.token).toBeTypeOf("string");
    expect(body.refreshToken).toBeTypeOf("string");
    expect(body.user.id).toBe(account.userId);
  });

  it("rejects an incorrect password with the generic credentials message", async () => {
    const { status, body } = await api("/api/users/login", {
      method: "POST",
      body: { identifier: account.mobile, password: "WrongPass123" },
    });
    expect(status).toBe(401);
    expect(body.message).toMatch(/invalid credentials/i);
  });

  it("rejects an unknown identifier with the same message (no account enumeration)", async () => {
    const { status, body } = await api("/api/users/login", {
      method: "POST",
      body: { identifier: "9999999999", password: "whatever123" },
    });
    expect(status).toBe(401);
    expect(body.message).toMatch(/invalid credentials/i);
  });

  it("issues a new access token from a valid refresh token", async () => {
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
  });

  it("rejects a bogus refresh token", async () => {
    const { status, body } = await api("/api/users/refresh-token", {
      method: "POST",
      body: { refreshToken: "not-a-real-refresh-token" },
    });
    expect(status).toBe(401);
    expect(body.message).toMatch(/session has expired/i);
  });

  it("blocks login for an account that hasn't verified its OTP yet", async () => {
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
    } finally {
      await deleteTestUser(reg.body.userId);
    }
  });
});
