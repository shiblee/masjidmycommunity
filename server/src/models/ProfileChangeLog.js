import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per changed field (not a single structured diff blob) — this keeps
// the admin "Profile Change Log" view a plain sortable/filterable table, and
// matches how a create/delete of a whole sub-entity (an Education row, a
// Skill) is logged: one row with field:null and a full JSON snapshot in
// oldValue/newValue rather than a per-field diff.
const ProfileChangeLog = sequelize.define(
  "ProfileChangeLog",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    section: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.ENUM("create", "update", "delete"), allowNull: false },
    entityId: { type: DataTypes.INTEGER, allowNull: true },
    field: { type: DataTypes.STRING, allowNull: true },
    oldValue: { type: DataTypes.TEXT, allowNull: true },
    newValue: { type: DataTypes.TEXT, allowNull: true },
    actorType: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    actorId: { type: DataTypes.INTEGER, allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "profile_change_logs",
    indexes: [{ fields: ["userId"], name: "profile_change_logs_user_id_idx" }],
  }
);

export default ProfileChangeLog;
