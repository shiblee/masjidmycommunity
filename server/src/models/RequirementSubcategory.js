import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Child of RequirementCategory (categoryId) -- no Sequelize associate() call,
// same convention as every other model in this codebase (e.g. Job/JobCategory
// have no belongsTo either); controllers join manually by categoryId.
// Unique per-category rather than globally, since two different categories
// may reasonably want a subcategory of the same name (e.g. "Other").
const RequirementSubcategory = sequelize.define(
  "RequirementSubcategory",
  {
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "requirement_subcategories",
    indexes: [
      { fields: ["categoryId"], name: "requirement_subcategories_category_id_idx" },
      { unique: true, fields: ["categoryId", "name"], name: "requirement_subcategories_category_name_unique" },
    ],
  }
);

export default RequirementSubcategory;
