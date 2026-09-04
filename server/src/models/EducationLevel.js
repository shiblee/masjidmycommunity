import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const EducationLevel = sequelize.define(
  "EducationLevel",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "education_levels",
    indexes: [{ unique: true, fields: ["name"], name: "education_levels_name_unique" }],
  }
);

export default EducationLevel;
