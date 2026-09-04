import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MaritalStatus = sequelize.define(
  "MaritalStatus",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "marital_statuses",
    indexes: [{ unique: true, fields: ["name"], name: "marital_statuses_name_unique" }],
  }
);

export default MaritalStatus;
