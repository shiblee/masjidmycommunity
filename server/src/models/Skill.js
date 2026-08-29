import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Skill = sequelize.define(
  "Skill",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "skills",
    indexes: [{ unique: true, fields: ["name"], name: "skills_name_unique" }],
  }
);

export default Skill;
