import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — the platform-wide auto-moderation configuration.
const ModerationSettings = sequelize.define(
  "ModerationSettings",
  {
    reportThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
  },
  {
    tableName: "moderation_settings",
  }
);

export default ModerationSettings;
