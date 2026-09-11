import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Mirrors UserActivityLog.js's shape (one row per login/logout EVENT, not
// per session; sessionId links a "login" row to its matching "logout" row
// so duration can be computed). Extended with module/action/target columns
// (all nullable, unused by Phase 1) so a later pass recording ordinary
// admin actions (masjid edited, job approved, ...) doesn't need a second
// ALTER TABLE -- it reuses this same table with those columns populated.
const AdminActivityLog = sequelize.define(
  "AdminActivityLog",
  {
    adminUserId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },

    activityType: { type: DataTypes.ENUM("login", "logout", "page_view", "action"), allowNull: false },
    status: { type: DataTypes.ENUM("success", "failure"), allowNull: false, defaultValue: "success" },
    failureReason: { type: DataTypes.STRING, allowNull: true },

    sessionId: { type: DataTypes.STRING, allowNull: true },
    logoutReason: { type: DataTypes.ENUM("user_initiated", "expired", "terminated"), allowNull: true },
    // Set on the login row once the matching logout row is recorded.
    sessionDurationSeconds: { type: DataTypes.INTEGER, allowNull: true },

    // Populated only for activityType "page_view"/"action" rows (Phase 2+).
    module: { type: DataTypes.STRING, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: true },
    targetType: { type: DataTypes.STRING, allowNull: true },
    targetId: { type: DataTypes.INTEGER, allowNull: true },
    summary: { type: DataTypes.STRING, allowNull: true },

    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    browser: { type: DataTypes.STRING, allowNull: true },
    browserVersion: { type: DataTypes.STRING, allowNull: true },
    os: { type: DataTypes.STRING, allowNull: true },
    deviceType: { type: DataTypes.ENUM("desktop", "mobile", "tablet", "unknown"), allowNull: false, defaultValue: "unknown" },
    deviceName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "admin_activity_logs",
    indexes: [
      { fields: ["adminUserId"], name: "admin_activity_logs_admin_user_id_idx" },
      { fields: ["sessionId"], name: "admin_activity_logs_session_id_idx" },
      { fields: ["activityType"], name: "admin_activity_logs_type_idx" },
      { fields: ["module"], name: "admin_activity_logs_module_idx" },
    ],
  }
);

export default AdminActivityLog;
