import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — admin-configurable visitor-counting rules, so the
// definition of "same session" / "returning visitor" / "active now" can be
// tuned without a code change or redeploy. See seed/visitorSettingsDefaults.js.
const VisitorSettings = sequelize.define(
  "VisitorSettings",
  {
    // A gap longer than this between page views/heartbeats ends the current
    // session — the next request starts a new one.
    sessionTimeoutMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    // A session counts as "active now" (for the public counter's implicit
    // presence and the admin "Online Now" widget) if its last activity was
    // within this many seconds.
    onlineWindowSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 120 },
    heartbeatSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    // A visitor whose last-ever visit was more than this many days ago is
    // treated as "new" again on their next visit, not "returning".
    returningWindowDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    countBots: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    countAdmins: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ipRetentionDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    publicCounterMode: { type: DataTypes.ENUM("unique_visitors", "sessions"), allowNull: false, defaultValue: "unique_visitors" },
    trackingEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "visitor_settings",
  }
);

export default VisitorSettings;
