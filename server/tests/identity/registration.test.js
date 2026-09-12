import { describe, it, expect, afterAll } from "vitest";
import { api, uniqueMobile, deleteTestUser } from "../helpers/testClient.js";

describe("Registration", () => {
  const createdUserIds = [];
  afterAll(async () => {
    for (const id of createdUserIds) await deleteTestUser(id);
  });

  it("rejects a missing full name", async () => {
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { mobile: uniqueMobile(), password: "TestPass123" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/full name/i);
  });

  it("rejects a weak password", async () => {
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest Weak", mobile: uniqueMobile(), password: "weak" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/password/i);
  });

  it("rejects when neither email nor mobile is supplied", async () => {
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest NoContact", password: "TestPass123" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/email address or a mobile number/i);
  });

  it("rejects an invalid mobile format", async () => {
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest BadMobile", mobile: "12345", password: "TestPass123" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/10-digit/i);
  });

  it("registers successfully and returns a 6-digit demo OTP", async () => {
    const mobile = uniqueMobile();
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest Registration", mobile, password: "TestPass123" },
    });
    expect(status).toBe(201);
    expect(body.userId).toBeTypeOf("number");
    expect(body.demoOtp).toMatch(/^\d{6}$/);
    createdUserIds.push(body.userId);
  });

  it("rejects a second registration with the same mobile number", async () => {
    const mobile = uniqueMobile();
    const first = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest Dup1", mobile, password: "TestPass123" },
    });
    createdUserIds.push(first.body.userId);

    const second = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest Dup2", mobile, password: "TestPass123" },
    });
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already registered/i);
  });

  it("rejects an incorrect OTP without activating the account", async () => {
    const mobile = uniqueMobile();
    const reg = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest BadOtp", mobile, password: "TestPass123" },
    });
    createdUserIds.push(reg.body.userId);

    const { status, body } = await api("/api/users/verify-otp", {
      method: "POST",
      body: { userId: reg.body.userId, otp: "000000" },
    });
    expect(status).toBe(400);
    expect(body.code).toBe("INVALID");
  });

  it("verifies with the real OTP, activates the account, and logs the user in", async () => {
    const mobile = uniqueMobile();
    const reg = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest GoodOtp", mobile, password: "TestPass123" },
    });
    createdUserIds.push(reg.body.userId);

    const { status, body } = await api("/api/users/verify-otp", {
      method: "POST",
      body: { userId: reg.body.userId, otp: reg.body.demoOtp },
    });
    expect(status).toBe(200);
    expect(body.token).toBeTypeOf("string");
    expect(body.refreshToken).toBeTypeOf("string");
    expect(body.user.status).toBe("active");
    expect(body.user.mobileVerified).toBe(true);
  });
});
