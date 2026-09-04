import crypto from "crypto";
import { Op } from "sequelize";
import UserSession from "../models/UserSession.js";
import { getRequestContext } from "../utils/requestContext.js";

const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000;
const REMEMBER_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Unlike userActivityService.js, errors here are NOT swallowed — this is
// the actual security boundary (refresh-token issuance/rotation/revocation),
// not a best-effort audit side-effect, so a failure here must fail the
// request rather than be silently ignored.

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function nextExpiry(remember) {
  return new Date(Date.now() + (remember ? REMEMBER_EXPIRY_MS : SESSION_EXPIRY_MS));
}

// Called once per fresh login/OTP-verify — creates the one UserSession row
// for this sessionId (the same sessionId already written onto the
// UserActivityLog "login" row by recordLoginSuccess). Returns the plaintext
// refresh token — the only time it's ever exposed outside this module.
export async function createUserSession(user, sessionId, remember, req) {
  const refreshToken = crypto.randomBytes(48).toString("hex");
  await UserSession.create({
    userId: user.id,
    sessionId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    remember: !!remember,
    expiresAt: nextExpiry(remember),
    ...getRequestContext(req),
  });
  return refreshToken;
}

// Validates a presented refresh token and, if valid, rotates it in place
// (same row, same sessionId, new hash, sliding expiry pushed forward again)
// so a stolen-and-reused-once old token is worthless on its next use.
export async function rotateUserSession(presentedToken, req) {
  const session = await UserSession.findOne({ where: { refreshTokenHash: hashRefreshToken(presentedToken) } });
  if (!session) return { error: "not_found" };
  if (session.revokedAt) return { error: "revoked" };
  if (new Date(session.expiresAt) < new Date()) return { error: "expired" };

  const refreshToken = crypto.randomBytes(48).toString("hex");
  session.refreshTokenHash = hashRefreshToken(refreshToken);
  session.expiresAt = nextExpiry(session.remember);
  Object.assign(session, getRequestContext(req));
  await session.save();

  return { session, refreshToken };
}

export async function revokeUserSessionById(sessionId) {
  if (!sessionId) return;
  await UserSession.update({ revokedAt: new Date() }, { where: { sessionId, revokedAt: null } });
}

export async function revokeAllUserSessions(userId) {
  await UserSession.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } });
}

// Revokes every session for a user EXCEPT one — used by changePassword so
// the device making the change stays signed in while every other device's
// refresh token dies immediately.
export async function revokeOtherUserSessions(userId, exceptSessionId) {
  const where = { userId, revokedAt: null };
  if (exceptSessionId) where.sessionId = { [Op.ne]: exceptSessionId };
  await UserSession.update({ revokedAt: new Date() }, { where });
}

// Rotates the caller's own current session in place (keeping its existing
// sessionId/remember flag) rather than revoking-then-recreating, which would
// collide with sessionId's unique index. Falls back to minting a brand-new
// session if the caller's access token predates this feature and carries no
// sessionId at all.
export async function reissueUserSession(userId, sessionId, req) {
  const session = sessionId ? await UserSession.findOne({ where: { sessionId, userId } }) : null;
  const refreshToken = crypto.randomBytes(48).toString("hex");

  if (session) {
    session.refreshTokenHash = hashRefreshToken(refreshToken);
    session.revokedAt = null;
    session.expiresAt = nextExpiry(session.remember);
    Object.assign(session, getRequestContext(req));
    await session.save();
    return { sessionId: session.sessionId, refreshToken };
  }

  const newSessionId = sessionId || crypto.randomUUID();
  await UserSession.create({
    userId,
    sessionId: newSessionId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    remember: true,
    expiresAt: nextExpiry(true),
    ...getRequestContext(req),
  });
  return { sessionId: newSessionId, refreshToken };
}
