import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per permissions PATCH on a staff account -- before/after pattern,
// same shape as MasjidPrayerTimeChangeLog.js. Kept even if the staff
// account is later deactivated (spec's "never delete historical audit
// records" requirement).
const PermissionChangeLog = sequelize.define(
  "PermissionChangeLog",
  {
    staffId: { type: DataTypes.INTEGER, allowNull: false },
    oldPermissions: { type: DataTypes.JSON, allowNull: true },
    newPermissions: { type: DataTypes.JSON, allowNull: true },
    changedByAdminId: { type: DataTypes.INTEGER, allowNull: false },
    changedByAdminName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "permission_change_logs",
    indexes: [{ fields: ["staffId"], name: "permission_change_logs_staff_id_idx" }],
  }
);

export default PermissionChangeLog;
