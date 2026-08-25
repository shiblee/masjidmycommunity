import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CampaignBudgetItem = sequelize.define(
  "CampaignBudgetItem",
  {
    campaignId: { type: DataTypes.INTEGER, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "campaign_budget_items",
    indexes: [{ fields: ["campaignId"], name: "campaign_budget_items_campaign_id_idx" }],
  }
);

export default CampaignBudgetItem;
