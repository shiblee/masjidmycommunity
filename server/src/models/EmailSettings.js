import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1). Only non-sensitive, display-level settings live here —
// actual SMTP credentials stay server-side in environment variables (see emailService.js).
const EmailSettings = sequelize.define(
  "EmailSettings",
  {
    senderName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Masjid My Community",
    },
    senderEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "hello@masjidmycommunity.org",
    },
    replyTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    adminNotificationEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "SMTP",
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "email_settings",
  }
);

export default EmailSettings;
