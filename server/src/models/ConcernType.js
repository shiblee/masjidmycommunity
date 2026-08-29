import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const ConcernType = sequelize.define(
  "ConcernType",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "concern_types",
    indexes: [{ unique: true, fields: ["name"], name: "concern_types_name_unique" }],
  }
);

export default ConcernType;
