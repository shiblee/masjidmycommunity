import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// In-app notifications shown from the bell icon in the admin panel. Shared
// across all admins (no per-admin scoping) — mirrors UserNotification's
// shape minus userId. `link` is a client-side path (e.g. /admin/concerns/12)
// the admin is taken to on click.
const AdminNotification = sequelize.define(
  "AdminNotification",
  {
    type: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    link: { type: DataTypes.STRING, allowNull: true },
    relatedConcernId: { type: DataTypes.INTEGER, allowNull: true },
    relatedContactId: { type: DataTypes.INTEGER, allowNull: true },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    readAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "admin_notifications",
    indexes: [{ fields: ["isRead"], name: "admin_notifications_is_read_idx" }],
  }
);

export default AdminNotification;
