import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CampaignPhoto = sequelize.define(
  "CampaignPhoto",
  {
    campaignId: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    mediaType: { type: DataTypes.ENUM("photo", "video"), allowNull: false, defaultValue: "photo" },
    caption: { type: DataTypes.STRING, allowNull: true },
    isCover: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "campaign_photos",
    indexes: [{ fields: ["campaignId"], name: "campaign_photos_campaign_id_idx" }],
  }
);

export default CampaignPhoto;
