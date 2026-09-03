import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const ContactMessageHistory = sequelize.define(
  "ContactMessageHistory",
  {
    contactMessageId: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    actorType: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "contact_message_history",
    indexes: [{ fields: ["contactMessageId"], name: "contact_message_history_contact_message_id_idx" }],
  }
);

export default ContactMessageHistory;
