import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A single entry in the Admin Panel's Developer documentation module (e.g.
// "Registration", "Masjid", "Community Wall"). The actual section content
// (Overview, Database Tables, APIs, ...) lives in DevDocSection, keyed by
// moduleId -- this row is just the module's identity, grouping, and status.
const DevDocModule = sequelize.define(
  "DevDocModule",
  {
    key: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM("draft", "in_review", "completed", "needs_update"),
      allowNull: false,
      defaultValue: "draft",
    },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "dev_doc_modules",
    indexes: [
      { unique: true, fields: ["key"], name: "dev_doc_modules_key_unique" },
      { fields: ["category"], name: "dev_doc_modules_category_idx" },
    ],
  }
);

export default DevDocModule;
