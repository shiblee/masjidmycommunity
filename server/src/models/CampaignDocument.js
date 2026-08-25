import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CampaignDocument = sequelize.define(
  "CampaignDocument",
  {
    campaignId: { type: DataTypes.INTEGER, allowNull: false },
    documentType: {
      type: DataTypes.ENUM("registration_certificate", "trust_deed", "noc", "budget_estimate", "other"),
      allowNull: false,
      defaultValue: "other",
    },
    fileName: { type: DataTypes.STRING, allowNull: false },
    // Stored outside the public /uploads static mount — served only via an
    // authenticated download route (campaign owner or admin), never a direct URL.
    storedPath: { type: DataTypes.STRING, allowNull: false },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "campaign_documents",
    indexes: [{ fields: ["campaignId"], name: "campaign_documents_campaign_id_idx" }],
  }
);

export default CampaignDocument;
