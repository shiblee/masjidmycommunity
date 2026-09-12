import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// An append-only changelog entry for a DevDocModule -- one row per "Save
// Documentation" action (not per keystroke). snapshotJson holds every
// section's {key, title, bodyHtml} at save time, so old content stays
// viewable under History even though there's no diff/rollback UI (by
// design -- a simple changelog was the chosen scope, not full versioning).
const DevDocVersion = sequelize.define(
  "DevDocVersion",
  {
    moduleId: { type: DataTypes.INTEGER, allowNull: false },
    versionNumber: { type: DataTypes.INTEGER, allowNull: false },
    updatedByName: { type: DataTypes.STRING, allowNull: true },
    changeSummary: { type: DataTypes.TEXT, allowNull: true },
    snapshotJson: { type: DataTypes.JSON, allowNull: false },
  },
  {
    tableName: "dev_doc_versions",
    indexes: [{ fields: ["moduleId"], name: "dev_doc_versions_module_id_idx" }],
  }
);

export default DevDocVersion;
