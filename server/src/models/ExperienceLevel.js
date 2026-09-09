import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const ExperienceLevel = sequelize.define(
  "ExperienceLevel",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "experience_levels",
    indexes: [{ unique: true, fields: ["name"], name: "experience_levels_name_unique" }],
  }
);

export default ExperienceLevel;
