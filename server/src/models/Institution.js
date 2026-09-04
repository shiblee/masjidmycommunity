import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Institution = sequelize.define(
  "Institution",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "institutions",
    indexes: [{ unique: true, fields: ["name"], name: "institutions_name_unique" }],
  }
);

export default Institution;
