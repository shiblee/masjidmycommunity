import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Company = sequelize.define(
  "Company",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "companies",
    indexes: [{ unique: true, fields: ["name"], name: "companies_name_unique" }],
  }
);

export default Company;
