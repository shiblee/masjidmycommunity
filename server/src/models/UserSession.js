import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One mutable row per live (or once-live) refresh session — unlike
// UserActivityLog, which is an append-only audit trail (one row per login/
// logout EVENT), this table is updated in place on every rotation and
// revocation. sessionId is the same UUID already written onto the
// correlated UserActivityLog "login" row, so the two can be joined for
// support/debugging without a foreign key (this codebase never declares
// Sequelize associations — every relation is a plain integer/string column).
const UserSession = sequelize.define(
  "UserSession",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    sessionId: { type: DataTypes.STRING, allowNull: false },
    // SHA-256 hex digest of the opaque refresh token — the plaintext is
    // never stored, only ever returned once to the client at issuance or
    // rotation time (mirrors how password hashes are handled).
    refreshTokenHash: { type: DataTypes.STRING(64), allowNull: false },
    remember: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Sliding window — pushed forward on every successful rotation rather
    // than fixed at login, so an actively-used session never hits this
    // ceiling; only a genuinely abandoned one does.
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
    // Denormalized from getRequestContext at last rotation — not used for
    // any security decision, just sets up a future "your devices" view.
    platform: { type: DataTypes.STRING, allowNull: false, defaultValue: "web" },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "user_sessions",
    indexes: [
      { fields: ["userId"], name: "user_sessions_user_id_idx" },
      { unique: true, fields: ["sessionId"], name: "user_sessions_session_id_unique" },
      { unique: true, fields: ["refreshTokenHash"], name: "user_sessions_refresh_token_hash_unique" },
    ],
  }
);

export default UserSession;
