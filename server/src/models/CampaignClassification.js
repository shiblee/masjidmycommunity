import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CampaignClassification = sequelize.define(
  "CampaignClassification",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "campaign_classifications",
    indexes: [{ unique: true, fields: ["name"], name: "campaign_classifications_name_unique" }],
  }
);

export default CampaignClassification;
