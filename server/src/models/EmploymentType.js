import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const EmploymentType = sequelize.define(
  "EmploymentType",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "employment_types",
    indexes: [{ unique: true, fields: ["name"], name: "employment_types_name_unique" }],
  }
);

export default EmploymentType;
