import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — admin-configurable character limits for Wall
// content, so these never need a code change/redeploy to adjust.
const ContentSettings = sequelize.define(
  "ContentSettings",
  {
    maxPostLength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2000 },
    maxCommentLength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
    maxReplyLength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
  },
  {
    tableName: "content_settings",
  }
);

export default ContentSettings;
