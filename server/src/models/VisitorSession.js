import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per visit — a burst of activity from one Visitor with no gap
// longer than VisitorSettings.sessionTimeoutMinutes. Reused across page
// views/heartbeats within that window; a new row starts once the gap is
// exceeded (see visitorTrackingService.js). ipAddress is the one field here
// with real retention rules — nulled out by the nightly maintenance sweep
// past VisitorSettings.ipRetentionDays; it's kept off the Visitor table
// entirely so it never accumulates a long-lived per-person history.
const VisitorSession = sequelize.define(
  "VisitorSession",
  {
    // Uniqueness declared via the named index below, not inline — see
    // Masjid.js's comment on `slug` for why.
    sessionKey: { type: DataTypes.STRING(36), allowNull: false },
    visitorId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    visitorType: { type: DataTypes.ENUM("new", "returning"), allowNull: false },

    startedAt: { type: DataTypes.DATE, allowNull: false },
    lastActivityAt: { type: DataTypes.DATE, allowNull: false },
    endedAt: { type: DataTypes.DATE, allowNull: true },
    durationSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    pageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

    landingPath: { type: DataTypes.STRING(512), allowNull: true },
    exitPath: { type: DataTypes.STRING(512), allowNull: true },
    referrerHost: { type: DataTypes.STRING(255), allowNull: true },
    referrerUrl: { type: DataTypes.STRING(512), allowNull: true },
    utmSource: { type: DataTypes.STRING(128), allowNull: true },
    utmMedium: { type: DataTypes.STRING(128), allowNull: true },
    utmCampaign: { type: DataTypes.STRING(128), allowNull: true },

    deviceType: { type: DataTypes.ENUM("desktop", "mobile", "tablet"), allowNull: true },
    deviceName: { type: DataTypes.STRING(128), allowNull: true },
    browser: { type: DataTypes.STRING(64), allowNull: true },
    browserVersion: { type: DataTypes.STRING(32), allowNull: true },
    os: { type: DataTypes.STRING(64), allowNull: true },
    platform: { type: DataTypes.STRING(32), allowNull: true },
    screenCategory: { type: DataTypes.ENUM("small", "medium", "large", "xlarge"), allowNull: true },
    language: { type: DataTypes.STRING(16), allowNull: true },
    timezone: { type: DataTypes.STRING(64), allowNull: true },
    country: { type: DataTypes.STRING(64), allowNull: true },
    countryCode: { type: DataTypes.STRING(2), allowNull: true },
    countrySource: { type: DataTypes.ENUM("timezone", "header", "unknown"), allowNull: false, defaultValue: "unknown" },

    status: { type: DataTypes.ENUM("active", "idle", "ended"), allowNull: false, defaultValue: "active" },
    isBot: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    tableName: "visitor_sessions",
    indexes: [
      { unique: true, fields: ["sessionKey"], name: "visitor_sessions_session_key_unique" },
      { fields: ["visitorId"], name: "visitor_sessions_visitor_id_idx" },
      { fields: ["startedAt"], name: "visitor_sessions_started_at_idx" },
      { fields: ["lastActivityAt"], name: "visitor_sessions_last_activity_at_idx" },
      { fields: ["status"], name: "visitor_sessions_status_idx" },
      { fields: ["startedAt", "visitorType"], name: "visitor_sessions_started_type_idx" },
      { fields: ["deviceType"], name: "visitor_sessions_device_type_idx" },
      { fields: ["countryCode"], name: "visitor_sessions_country_code_idx" },
    ],
  }
);

export default VisitorSession;
