import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per page viewed within a session — kept as a real table (not a
// JSON column on VisitorSession) specifically so "which page do visitors
// exit from most" and per-page dwell time can be computed with a plain
// indexed GROUP BY, which a JSON array can't do in MySQL without generated
// columns.
const VisitorPageView = sequelize.define(
  "VisitorPageView",
  {
    sessionId: { type: DataTypes.INTEGER, allowNull: false },
    visitorId: { type: DataTypes.INTEGER, allowNull: false },
    sequence: { type: DataTypes.INTEGER, allowNull: false },
    path: { type: DataTypes.STRING(512), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: true },
    viewedAt: { type: DataTypes.DATE, allowNull: false },
    leftAt: { type: DataTypes.DATE, allowNull: true },
    durationSeconds: { type: DataTypes.INTEGER, allowNull: true },
    // Denormalized copy of the parent VisitorSession's trafficType, set once
    // at creation — lets page-view aggregates (e.g. rebuildDailyStat's
    // pageViews count) filter genuine-vs-synthetic directly without a join.
    trafficType: { type: DataTypes.ENUM("genuine", "synthetic"), allowNull: false, defaultValue: "genuine" },
  },
  {
    tableName: "visitor_page_views",
    indexes: [
      { fields: ["sessionId"], name: "visitor_page_views_session_id_idx" },
      { fields: ["path", "viewedAt"], name: "visitor_page_views_path_viewed_at_idx" },
      { fields: ["viewedAt"], name: "visitor_page_views_viewed_at_idx" },
      { fields: ["trafficType"], name: "visitor_page_views_traffic_type_idx" },
    ],
  }
);

export default VisitorPageView;
