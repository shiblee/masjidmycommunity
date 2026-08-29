import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// In-app notifications shown from the bell icon in the user panel. `link` is
// a client-side path (e.g. /account/my-masjids/12) the user is taken to on click.
const UserNotification = sequelize.define(
  "UserNotification",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    link: { type: DataTypes.STRING, allowNull: true },
    relatedMasjidId: { type: DataTypes.INTEGER, allowNull: true },
    relatedCampaignId: { type: DataTypes.INTEGER, allowNull: true },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    readAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "user_notifications",
    indexes: [
      { fields: ["userId"], name: "user_notifications_user_id_idx" },
      { fields: ["userId", "isRead"], name: "user_notifications_user_id_is_read_idx" },
    ],
  }
);

export default UserNotification;
