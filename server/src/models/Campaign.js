import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Campaign = sequelize.define(
  "Campaign",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: true },

    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false },
    shortDescription: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },

    donationType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "General Sadaqah",
    },
    zakatEligibilityNote: { type: DataTypes.TEXT, allowNull: true },

    goalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "INR" },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },

    status: {
      type: DataTypes.ENUM(
        "draft",
        "submitted",
        "under_review",
        "changes_requested",
        "approved",
        "active",
        "paused",
        "goal_reached",
        "completed",
        "rejected",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "draft",
    },
    adminFeedback: { type: DataTypes.TEXT, allowNull: true },
    islamicReviewNotes: { type: DataTypes.TEXT, allowNull: true },
    complianceReviewNotes: { type: DataTypes.TEXT, allowNull: true },

    submittedAt: { type: DataTypes.DATE, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },

    // Community-report moderation — separate from the approval `status` above.
    // "under_review" here hides the campaign from the public listing/Wall
    // without touching its approval state or any of its data.
    moderationStatus: { type: DataTypes.ENUM("active", "under_review"), allowNull: false, defaultValue: "active" },
    reportCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    moderationReviewedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "campaigns",
    indexes: [
      { fields: ["masjidId"], name: "campaigns_masjid_id_idx" },
      { fields: ["createdBy"], name: "campaigns_created_by_idx" },
      { fields: ["status"], name: "campaigns_status_idx" },
      { unique: true, fields: ["slug"], name: "campaigns_slug_unique" },
    ],
  }
);

export default Campaign;
