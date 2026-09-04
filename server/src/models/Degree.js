import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Degree = sequelize.define(
  "Degree",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "degrees",
    indexes: [{ unique: true, fields: ["name"], name: "degrees_name_unique" }],
  }
);

export default Degree;
