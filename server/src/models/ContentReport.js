import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A single report filed by a user against a piece of content. targetType +
// targetId identify what's being reported (a Masjid, a Campaign, or — for Wall
// activity that isn't tied to either, like a new-member post — the
// CommunityActivity row itself). activityId records which specific Wall post
// the report was filed from, purely for admin context, even when the report's
// real target is the underlying masjid/campaign.
const ContentReport = sequelize.define(
  "ContentReport",
  {
    targetType: { type: DataTypes.ENUM("masjid", "campaign", "activity", "comment", "image"), allowNull: false },
    targetId: { type: DataTypes.INTEGER, allowNull: false },
    activityId: { type: DataTypes.INTEGER, allowNull: true },
    reporterId: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    // Reports stay "open" until an admin moderation action closes them out —
    // either by clearing them as invalid or by acting on the content.
    status: { type: DataTypes.ENUM("open", "closed"), allowNull: false, defaultValue: "open" },
  },
  {
    tableName: "content_reports",
    indexes: [
      { fields: ["targetType", "targetId"], name: "content_reports_target_idx" },
      // One report per user per piece of content — stops a single account
      // from artificially driving up the count toward the auto-hide threshold.
      { unique: true, fields: ["targetType", "targetId", "reporterId"], name: "content_reports_unique_reporter" },
    ],
  }
);

export default ContentReport;
