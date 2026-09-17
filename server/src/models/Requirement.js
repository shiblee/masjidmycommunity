import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A user's request for a service (e.g. "need a plumber"), scoped to an
// admin-managed category/subcategory. Modeled on Job.js's plain-FK,
// no-associate() style. categoryName/subcategoryName are denormalized
// snapshots (same reasoning as Job.category) -- a Requirement's own display
// text survives a later rename of the category/subcategory it pointed to.
const Requirement = sequelize.define(
  "Requirement",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    subcategoryId: { type: DataTypes.INTEGER, allowNull: false },
    categoryName: { type: DataTypes.STRING, allowNull: false },
    subcategoryName: { type: DataTypes.STRING, allowNull: false },
    remark: { type: DataTypes.TEXT, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    formattedAddress: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    placeId: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM("open", "fulfilled", "closed"), allowNull: false, defaultValue: "open" },
  },
  {
    tableName: "requirements",
    indexes: [
      { fields: ["userId"], name: "requirements_user_id_idx" },
      { fields: ["categoryId"], name: "requirements_category_id_idx" },
      { fields: ["subcategoryId"], name: "requirements_subcategory_id_idx" },
      { fields: ["status"], name: "requirements_status_idx" },
    ],
  }
);

export default Requirement;
