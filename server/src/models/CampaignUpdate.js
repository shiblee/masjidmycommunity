import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CampaignUpdate = sequelize.define(
  "CampaignUpdate",
  {
    campaignId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "campaign_updates",
    indexes: [{ fields: ["campaignId"], name: "campaign_updates_campaign_id_idx" }],
  }
);

export default CampaignUpdate;
