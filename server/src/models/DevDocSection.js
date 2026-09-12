import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One documentation section (Overview, Database Tables, APIs, ...) under a
// DevDocModule. Every new module is seeded with the fixed default set of
// keys (see server/src/seed/devDocsDefaults.js), but admins can add/remove
// custom sections per module through the admin UI -- key/title are free
// text for anything beyond the defaults, sortOrder controls display order.
const DevDocSection = sequelize.define(
  "DevDocSection",
  {
    moduleId: { type: DataTypes.INTEGER, allowNull: false },
    key: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    bodyHtml: { type: DataTypes.TEXT("long"), allowNull: false, defaultValue: "" },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "dev_doc_sections",
    indexes: [{ fields: ["moduleId"], name: "dev_doc_sections_module_id_idx" }],
  }
);

export default DevDocSection;
