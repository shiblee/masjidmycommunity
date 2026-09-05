import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — admin-configurable review text/media limits and
// feature toggles, so none of these need a code change/redeploy to adjust.
const ReviewSettings = sequelize.define(
  "ReviewSettings",
  {
    maxLength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
    maxImages: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    maxVideoSizeMB: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 },
    maxVideoDurationSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
    allowedImageFormats: { type: DataTypes.STRING, allowNull: false, defaultValue: "jpg,png,webp" },
    allowedVideoFormats: { type: DataTypes.STRING, allowNull: false, defaultValue: "mp4,webm,mov" },
    mediaEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    speechToTextEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "review_settings",
  }
);

export default ReviewSettings;
