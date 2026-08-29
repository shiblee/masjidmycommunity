import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const DeletionReason = sequelize.define(
  "DeletionReason",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "deletion_reasons",
    indexes: [{ unique: true, fields: ["name"], name: "deletion_reasons_name_unique" }],
  }
);

export default DeletionReason;
