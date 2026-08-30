import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Language = sequelize.define(
  "Language",
  {
    code: { type: DataTypes.STRING(10), allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    nativeName: { type: DataTypes.STRING, allowNull: false },
    direction: { type: DataTypes.ENUM("ltr", "rtl"), allowNull: false, defaultValue: "ltr" },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "languages",
    indexes: [{ unique: true, fields: ["code"], name: "languages_code_unique" }],
  }
);

export default Language;
