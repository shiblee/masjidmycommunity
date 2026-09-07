import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per masjid — its current (or most recent) Green Tick application.
// This is the "central Masjid verification state" every display surface
// reads (via greenTickService.js's badge-info helpers), so a masjid's
// status here is the single source of truth for the badge everywhere.
const GreenTickApplication = sequelize.define(
  "GreenTickApplication",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "submitted",
        "under_review",
        "documents_required",
        "clarification_required",
        "partially_verified",
        "verification_failed",
        "approved",
        "green_tick_issued",
        "suspended",
        "revoked"
      ),
      allowNull: false,
      defaultValue: "draft",
    },
    // "MMC-000123" — generated once, at first submission, from the row's own
    // id so it's guaranteed unique with no separate counter to maintain.
    verificationId: { type: DataTypes.STRING, allowNull: true },
    submittedAt: { type: DataTypes.DATE, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    issuedAt: { type: DataTypes.DATE, allowNull: true },
    suspendedAt: { type: DataTypes.DATE, allowNull: true },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "green_tick_applications",
    indexes: [
      { unique: true, fields: ["masjidId"], name: "green_tick_applications_masjid_unique" },
      { unique: true, fields: ["verificationId"], name: "green_tick_applications_verification_id_unique" },
    ],
  }
);

export default GreenTickApplication;
