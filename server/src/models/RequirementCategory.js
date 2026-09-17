import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Master list of top-level Requirement categories (Home Service, Personal
// Care, ...), admin-managed under Admin Panel -> Meta -> Requirement
// Category — same shape as JobCategory.js. Each category owns a set of
// RequirementSubcategory rows (see that model) rather than a flat list, since
// a Requirement always picks both.
const RequirementCategory = sequelize.define(
  "RequirementCategory",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "requirement_categories",
    indexes: [{ unique: true, fields: ["name"], name: "requirement_categories_name_unique" }],
  }
);

export default RequirementCategory;
