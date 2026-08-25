import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MasjidCategory = sequelize.define(
  "MasjidCategory",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "masjid_categories",
    indexes: [{ unique: true, fields: ["name"], name: "masjid_categories_name_unique" }],
  }
);

export default MasjidCategory;
