import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per UTC calendar date — incrementally maintained plus rebuilt
// idempotently every hour by visitorMaintenanceService.js, so period-over-
// period insights (e.g. "traffic +24% vs last period") never need to scan
// raw visitor_sessions rows.
const VisitorDailyStat = sequelize.define(
  "VisitorDailyStat",
  {
    // Uniqueness declared via the named index below, not inline — see
    // Masjid.js's comment on `slug` for why.
    statDate: { type: DataTypes.DATEONLY, allowNull: false },
    sessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    uniqueVisitors: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    newVisitors: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    returningVisitors: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    pageViews: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    totalDurationSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    bounceSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    mobileSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    tabletSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    desktopSessions: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "visitor_daily_stats",
    indexes: [{ unique: true, fields: ["statDate"], name: "visitor_daily_stats_stat_date_unique" }],
  }
);

export default VisitorDailyStat;
