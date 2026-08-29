import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const ReportReason = sequelize.define(
  "ReportReason",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "report_reasons",
    indexes: [{ unique: true, fields: ["name"], name: "report_reasons_name_unique" }],
  }
);

export default ReportReason;
