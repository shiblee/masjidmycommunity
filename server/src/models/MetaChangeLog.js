import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per changed field (not a single structured diff blob) — mirrors
// ProfileChangeLog's shape so the admin "Meta Change Log" view stays a plain
// sortable/filterable table. A create/delete of a whole entity is logged as
// one row with field:null and a full JSON snapshot in newValue/oldValue
// rather than a per-field diff. `entityName` is denormalized (captured at
// the time of the change) so the log still reads clearly after an entity is
// renamed or deleted.
const MetaChangeLog = sequelize.define(
  "MetaChangeLog",
  {
    entityType: { type: DataTypes.STRING, allowNull: false },
    entityId: { type: DataTypes.INTEGER, allowNull: true },
    entityName: { type: DataTypes.STRING, allowNull: true },
    action: { type: DataTypes.ENUM("create", "update", "delete"), allowNull: false },
    field: { type: DataTypes.STRING, allowNull: true },
    oldValue: { type: DataTypes.TEXT, allowNull: true },
    newValue: { type: DataTypes.TEXT, allowNull: true },
    actorId: { type: DataTypes.INTEGER, allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "meta_change_logs",
    indexes: [
      { fields: ["entityType"], name: "meta_change_logs_entity_type_idx" },
      { fields: ["entityType", "entityId"], name: "meta_change_logs_entity_idx" },
    ],
  }
);

export default MetaChangeLog;
