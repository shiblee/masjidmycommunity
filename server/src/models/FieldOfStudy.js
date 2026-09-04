import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const FieldOfStudy = sequelize.define(
  "FieldOfStudy",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "fields_of_study",
    indexes: [{ unique: true, fields: ["name"], name: "fields_of_study_name_unique" }],
  }
);

export default FieldOfStudy;
