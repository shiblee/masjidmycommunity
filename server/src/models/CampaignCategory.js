import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CampaignCategory = sequelize.define(
  "CampaignCategory",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "campaign_categories",
    indexes: [{ unique: true, fields: ["name"], name: "campaign_categories_name_unique" }],
  }
);

export default CampaignCategory;
