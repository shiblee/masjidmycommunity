import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per browser (identified by the first-party mmc_vid cookie — see
// middleware/visitorCookie.js), independent of how many sessions/visits it
// has made. The public "Total Visitors" counter is a COUNT of this table —
// it only grows when a genuinely new cookie shows up, never on a refresh or
// a returning visit (see VisitorSession for that).
const Visitor = sequelize.define(
  "Visitor",
  {
    // Uniqueness declared via the named index below, not inline here — see
    // Masjid.js's comment on `slug` for why (inline column `unique: true`
    // isn't tracked by name across sequelize.sync({alter:true}) restarts
    // and silently accumulates a fresh duplicate index every time).
    visitorKey: { type: DataTypes.STRING(36), allowNull: false },
    firstSeenAt: { type: DataTypes.DATE, allowNull: false },
    lastSeenAt: { type: DataTypes.DATE, allowNull: false },
    sessionCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    pageViewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lastDeviceType: { type: DataTypes.STRING(16), allowNull: true },
    lastCountry: { type: DataTypes.STRING(64), allowNull: true },
    // Set once this anonymous cookie is seen making an authenticated
    // request — purely informational (e.g. "this visitor later signed up"),
    // never used to identify or look someone up by name.
    lastUserId: { type: DataTypes.INTEGER, allowNull: true },
    isBot: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // "genuine" (a real browser) vs "synthetic" (the admin-configurable demo
    // bot in syntheticVisitorService.js) — deliberately separate from isBot,
    // which only flags a detected web-crawler UA on a real request. Every
    // count/aggregate elsewhere in this app defaults to trafficType:"genuine"
    // unless an admin explicitly asks for a combined view.
    trafficType: { type: DataTypes.ENUM("genuine", "synthetic"), allowNull: false, defaultValue: "genuine" },
  },
  {
    tableName: "visitors",
    indexes: [
      { unique: true, fields: ["visitorKey"], name: "visitors_visitor_key_unique" },
      { fields: ["lastSeenAt"], name: "visitors_last_seen_at_idx" },
      { fields: ["firstSeenAt"], name: "visitors_first_seen_at_idx" },
      { fields: ["trafficType"], name: "visitors_traffic_type_idx" },
    ],
  }
);

export default Visitor;
