import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Reference is a short human-friendly code (e.g. CONCERN-7F3K2Q) shown to the
// submitter and used in support conversations — separate from the numeric id.
const Concern = sequelize.define(
  "Concern",
  {
    reference: { type: DataTypes.STRING, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    concernType: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    // Freeform "related campaign or masjid" reference the submitter typed —
    // not a validated FK, since a concern may reference something outside
    // the submitter's own masjids/campaigns.
    relatedReference: { type: DataTypes.STRING, allowNull: true },

    status: {
      type: DataTypes.ENUM("open", "resolved", "closed"),
      allowNull: false,
      defaultValue: "open",
    },
    adminRemarks: { type: DataTypes.TEXT, allowNull: true },
    resolvedBy: { type: DataTypes.STRING, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "concerns",
    indexes: [
      { unique: true, fields: ["reference"], name: "concerns_reference_unique" },
      { fields: ["status"], name: "concerns_status_idx" },
      { fields: ["concernType"], name: "concerns_type_idx" },
    ],
  }
);

export default Concern;
