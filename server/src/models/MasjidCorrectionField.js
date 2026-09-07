import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per field a user proposed a correction for, within a single
// MasjidCorrectionRequest. This row IS the audit trail — currentValue is
// a server-computed snapshot taken at submission time (never trust a
// client-supplied "current" value), suggestedValue is what the user
// proposed, and finalValue/status/decidedBy* record what the admin did
// with it. Track-only: approving a field never writes through to the live
// Masjid/MasjidContactPerson/MasjidPhoto tables — the admin applies the
// real edit themselves via the existing masjid-edit screens.
const MasjidCorrectionField = sequelize.define(
  "MasjidCorrectionField",
  {
    requestId: { type: DataTypes.INTEGER, allowNull: false },
    fieldKey: {
      type: DataTypes.ENUM("name", "category", "location", "photos", "contact", "prayer_times", "other"),
      allowNull: false,
    },
    currentValue: { type: DataTypes.JSON, allowNull: true },
    suggestedValue: { type: DataTypes.JSON, allowNull: false },
    finalValue: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "modified_approved"),
      allowNull: false,
      defaultValue: "pending",
    },
    decidedByAdminName: { type: DataTypes.STRING, allowNull: true },
    decidedAt: { type: DataTypes.DATE, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "masjid_correction_fields",
    indexes: [{ fields: ["requestId"], name: "masjid_correction_fields_request_id_idx" }],
  }
);

export default MasjidCorrectionField;
