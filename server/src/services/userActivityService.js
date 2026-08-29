import crypto from "crypto";
import UserActivityLog from "../models/UserActivityLog.js";
import { getRequestContext } from "../utils/requestContext.js";

// Activity logging must never break login/logout itself — every entry point
// here swallows its own errors, mirroring communityActivityService's rule.

export async function recordLoginSuccess(user, req, { loginMethod = "password" } = {}) {
  const sessionId = crypto.randomUUID();
  try {
    await UserActivityLog.create({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      activityType: "login",
      status: "success",
      sessionId,
      loginMethod,
      platform: "web",
      ...getRequestContext(req),
    });
  } catch {
    // logging failure must not block a successful login
  }
  return sessionId;
}

export async function recordLoginFailure(user, req, failureReason) {
  try {
    await UserActivityLog.create({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      activityType: "login",
      status: "failure",
      failureReason,
      platform: "web",
      ...getRequestContext(req),
    });
  } catch {
    // best-effort only
  }
}

export async function recordLogout(user, sessionId, req, logoutReason = "user_initiated") {
  try {
    const logoutRow = await UserActivityLog.create({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      activityType: "logout",
      status: "success",
      sessionId: sessionId || null,
      logoutReason,
      platform: "web",
      ...getRequestContext(req),
    });

    if (sessionId) {
      const loginRow = await UserActivityLog.findOne({
        where: { userId: user.id, sessionId, activityType: "login", status: "success" },
        order: [["createdAt", "DESC"]],
      });
      if (loginRow) {
        const durationSeconds = Math.max(0, Math.round((logoutRow.createdAt - loginRow.createdAt) / 1000));
        loginRow.sessionDurationSeconds = durationSeconds;
        await loginRow.save();
      }
    }
  } catch {
    // best-effort only
  }
}
