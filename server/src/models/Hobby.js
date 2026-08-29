import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Hobby = sequelize.define(
  "Hobby",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "hobbies",
    indexes: [{ unique: true, fields: ["name"], name: "hobbies_name_unique" }],
  }
);

export default Hobby;
