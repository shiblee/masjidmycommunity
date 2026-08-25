import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CampaignHistory = sequelize.define(
  "CampaignHistory",
  {
    campaignId: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    actorType: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "campaign_history",
    indexes: [{ fields: ["campaignId"], name: "campaign_history_campaign_id_idx" }],
  }
);

export default CampaignHistory;
