import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — admin-configurable controls for the synthetic
// visitor bot (syntheticVisitorService.js / visitorBotSchedulerService.js).
// See seed/visitorBotSettingsDefaults.js. Every save is audited via
// utils/metaChangeLog.js the same way every other "Meta"-style settings
// controller in this app is.
const VisitorBotSettings = sequelize.define(
  "VisitorBotSettings",
  {
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    visitorsPerHour: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    // International % is always `100 - indiaPercent` — never stored
    // separately, so the two can never drift out of summing to 100.
    indiaPercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
    // Null = active all day. Otherwise an hour-of-day (0-23, UTC) window.
    activeHourStart: { type: DataTypes.INTEGER, allowNull: true },
    activeHourEnd: { type: DataTypes.INTEGER, allowNull: true },
    // JSON array of path strings the generator may pick a landing/page-view
    // path from. Null/empty = the built-in default safe pool.
    allowedPaths: { type: DataTypes.JSON, allowNull: true },
    sessionDurationMinSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
    sessionDurationMaxSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 300 },
    pagesPerSessionMin: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    pagesPerSessionMax: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    deviceWeights: { type: DataTypes.JSON, allowNull: false, defaultValue: { desktop: 40, mobile: 50, tablet: 10 } },
    browserWeights: { type: DataTypes.JSON, allowNull: false, defaultValue: { Chrome: 60, Safari: 20, Firefox: 12, Edge: 8 } },
    // What the admin Visitors dashboard's "include synthetic" toggle starts
    // as on a fresh page load — the toggle itself is not persisted per view.
    combinedViewDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "visitor_bot_settings",
  }
);

export default VisitorBotSettings;
