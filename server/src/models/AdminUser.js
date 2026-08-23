import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const AdminUser = sequelize.define(
  "AdminUser",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Platform Administrator",
    },
    status: {
      type: DataTypes.ENUM("active", "invited", "suspended"),
      allowNull: false,
      defaultValue: "active",
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    loginAlerts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        notifications: {
          newDonations: true,
          verificationRequests: true,
          campaignMilestones: true,
          weeklyDigest: false,
          productUpdates: false,
        },
        platform: {
          currency: "INR",
          timezone: "ist",
          dateFormat: "mdy",
          verificationSla: "5",
        },
      },
    },
  },
  {
    tableName: "admin_users",
    indexes: [{ unique: true, fields: ["email"], name: "admin_users_email_unique" }],
  }
);

export default AdminUser;
