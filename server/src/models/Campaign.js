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
      type: DataTypes.ENUM("general_sadaqah", "zakat", "waqf", "other"),
      allowNull: false,
      defaultValue: "general_sadaqah",
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
