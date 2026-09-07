import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Links an application to an existing MasjidContactPerson — a "representative"
// for Green Tick purposes IS a contact person (name/designation/mobile
// already live there, mobile already OTP-verified); this table only adds
// the Green-Tick-specific verification layered on top. Identity and
// authorization are tracked separately per the spec: proving who someone is
// does not by itself prove they're authorized to represent the masjid.
const GreenTickRepresentative = sequelize.define(
  "GreenTickRepresentative",
  {
    applicationId: { type: DataTypes.INTEGER, allowNull: false },
    contactPersonId: { type: DataTypes.INTEGER, allowNull: false },
    identityVerificationStatus: { type: DataTypes.ENUM("pending", "approved", "rejected"), allowNull: false, defaultValue: "pending" },
    authorizationStatus: { type: DataTypes.ENUM("pending", "approved", "rejected"), allowNull: false, defaultValue: "pending" },
    reviewerRemarks: { type: DataTypes.TEXT, allowNull: true },
    verifiedAt: { type: DataTypes.DATE, allowNull: true },
    verifiedBy: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "green_tick_representatives",
    indexes: [
      { unique: true, fields: ["applicationId", "contactPersonId"], name: "green_tick_reps_app_contact_unique" },
    ],
  }
);

export default GreenTickRepresentative;
