import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommunityActivity = sequelize.define(
  "CommunityActivity",
  {
    type: {
      type: DataTypes.ENUM(
        "new_user",
        "masjid_approved",
        "campaign_approved",
        "donation",
        "milestone",
        "project_update",
        "announcement",
        "community_post"
      ),
      allowNull: false,
    },
    title: { type: DataTypes.STRING, allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: true },
    imageUrl: { type: DataTypes.STRING, allowNull: true },

    // User-authored Wall posts only ("community_post"). Images live in their
    // own PostImage rows (so each can carry its own likes/comments/reports);
    // video stays a single URL here since only one is allowed per post.
    mediaVideoUrl: { type: DataTypes.STRING, allowNull: true },

    relatedMasjidId: { type: DataTypes.INTEGER, allowNull: true },
    relatedUserId: { type: DataTypes.INTEGER, allowNull: true },
    relatedCampaignId: { type: DataTypes.INTEGER, allowNull: true },

    metadata: { type: DataTypes.JSON, allowNull: true },

    status: {
      type: DataTypes.ENUM("published", "pending_review", "hidden"),
      allowNull: false,
      defaultValue: "published",
    },
    isPinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publishedAt: { type: DataTypes.DATE, allowNull: true },

    // Community-report moderation, for activity posts with no masjid/campaign
    // to attach the report to instead (e.g. a new-member post).
    reportCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "community_activities",
    indexes: [
      { fields: ["status"], name: "activities_status_idx" },
      { fields: ["type"], name: "activities_type_idx" },
    ],
  }
);

export default CommunityActivity;
