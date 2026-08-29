import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per login/logout event, not per session — a completed session is
// two rows (a "login" row and a "logout" row) linked by sessionId. name/email
// are snapshotted at event time so history reads correctly even if the
// account's contact details change later.
const UserActivityLog = sequelize.define(
  "UserActivityLog",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },

    activityType: { type: DataTypes.ENUM("login", "logout"), allowNull: false },
    status: { type: DataTypes.ENUM("success", "failure"), allowNull: false, defaultValue: "success" },
    failureReason: { type: DataTypes.STRING, allowNull: true },

    // Links a login row to its matching logout row so session duration can
    // be computed. Null for failed login attempts, which never open a session.
    sessionId: { type: DataTypes.STRING, allowNull: true },
    loginMethod: { type: DataTypes.STRING, allowNull: true },
    platform: { type: DataTypes.STRING, allowNull: false, defaultValue: "web" },
    logoutReason: { type: DataTypes.ENUM("user_initiated", "expired", "terminated"), allowNull: true },
    // Set on the login row once the matching logout row is recorded.
    sessionDurationSeconds: { type: DataTypes.INTEGER, allowNull: true },

    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    browser: { type: DataTypes.STRING, allowNull: true },
    browserVersion: { type: DataTypes.STRING, allowNull: true },
    os: { type: DataTypes.STRING, allowNull: true },
    deviceType: { type: DataTypes.ENUM("desktop", "mobile", "tablet", "unknown"), allowNull: false, defaultValue: "unknown" },
    deviceName: { type: DataTypes.STRING, allowNull: true },
    // Best-effort only; left null unless a geo-IP provider is configured —
    // never inferred or guessed from the IP address alone.
    location: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "user_activity_logs",
    indexes: [
      { fields: ["userId"], name: "user_activity_logs_user_id_idx" },
      { fields: ["sessionId"], name: "user_activity_logs_session_id_idx" },
      { fields: ["activityType"], name: "user_activity_logs_type_idx" },
    ],
  }
);

export default UserActivityLog;
