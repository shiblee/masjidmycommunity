import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Bank = sequelize.define(
  "Bank",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "banks",
    indexes: [{ unique: true, fields: ["name"], name: "banks_name_unique" }],
  }
);

export default Bank;
