import { describe, it, expect, afterAll } from "vitest";
import { api, uniqueMobile, uniqueEmail, deleteTestUser } from "../helpers/testClient.js";

describe("Registration", () => {
  const createdUserIds = [];
  afterAll(async () => {
    for (const id of createdUserIds) await deleteTestUser(id);
  });

  it("rejects a missing full name", async ({ task }) => {
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { mobile: uniqueMobile(), password: "TestPass123" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/full name/i);
    task.meta.detail = "POST /api/users/register with no fullName -> 400, message mentions \"full name\".";
  });

  it("rejects a weak password", async ({ task }) => {
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest Weak", mobile: uniqueMobile(), password: "weak" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/password/i);
    task.meta.detail = "POST /api/users/register with password \"weak\" -> 400, message mentions \"password\".";
  });

  it("rejects when neither email nor mobile is supplied", async ({ task }) => {
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest NoContact", password: "TestPass123" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/email address or a mobile number/i);
    task.meta.detail = "POST /api/users/register with neither email nor mobile -> 400.";
  });

  it("rejects an invalid mobile format", async ({ task }) => {
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest BadMobile", mobile: "12345", password: "TestPass123" },
    });
    expect(status).toBe(400);
    expect(body.message).toMatch(/10-digit/i);
    task.meta.detail = "POST /api/users/register with mobile \"12345\" -> 400, requires a 10-digit number.";
  });

  it("registers successfully and returns a 6-digit demo OTP", async ({ task }) => {
    const mobile = uniqueMobile();
    const { status, body } = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest Registration", mobile, password: "TestPass123" },
    });
    expect(status).toBe(201);
    expect(body.userId).toBeTypeOf("number");
    expect(body.demoOtp).toMatch(/^\d{6}$/);
    createdUserIds.push(body.userId);
    task.meta.detail = "POST /api/users/register with valid fullName/mobile/password -> 201, numeric userId, 6-digit demoOtp.";
  });

  it("rejects a second registration with the same mobile number", async ({ task }) => {
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
    task.meta.detail = "Registering twice with the same mobile -> second attempt gets 409 \"already registered\".";
  });

  it("rejects a second registration with the same email address", async ({ task }) => {
    const email = uniqueEmail("regdup");
    const first = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest EmailDup1", email, password: "TestPass123" },
    });
    createdUserIds.push(first.body.userId);

    const second = await api("/api/users/register", {
      method: "POST",
      body: { fullName: "DevTest EmailDup2", email, password: "TestPass123" },
    });
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/email.*already registered/i);
    task.meta.detail = "Registering twice with the same email (no mobile) -> second attempt gets 409, the email-specific duplicate branch.";
  });

  it("rejects an incorrect OTP without activating the account", async ({ task }) => {
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
    task.meta.detail = "POST /api/users/verify-otp with a wrong 6-digit code -> 400 code INVALID, account stays unverified.";
  });

  it("verifies with the real OTP, activates the account, and logs the user in", async ({ task }) => {
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
    task.meta.detail = "POST /api/users/verify-otp with the real demoOtp -> 200, returns token+refreshToken, user.status becomes \"active\".";
  });
});
