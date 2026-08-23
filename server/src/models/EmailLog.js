import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const EmailLog = sequelize.define(
  "EmailLog",
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notificationType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("sent", "failed", "skipped"),
      allowNull: false,
    },
    errorMessage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "email_logs",
  }
);

export default EmailLog;
