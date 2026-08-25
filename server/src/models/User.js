import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isEmail: true },
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    registrationMethod: {
      type: DataTypes.ENUM("email", "mobile", "both"),
      allowNull: false,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mobileVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM("pending_verification", "active", "inactive", "suspended"),
      allowNull: false,
      defaultValue: "pending_verification",
    },
    otpCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    otpPurpose: {
      type: DataTypes.ENUM("register", "reset_password", "update_contact"),
      allowNull: true,
    },
    otpTarget: {
      type: DataTypes.ENUM("email", "mobile"),
      allowNull: true,
    },
    otpAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Bumped on password change; embedded in the JWT so older tokens issued
    // before the change stop being accepted (a lightweight session-rotation
    // mechanism — this app has no server-side session store to revoke).
    tokenVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "users",
    indexes: [
      { unique: true, fields: ["username"], name: "users_username_unique" },
      { unique: true, fields: ["email"], name: "users_email_unique" },
      { unique: true, fields: ["mobile"], name: "users_mobile_unique" },
    ],
  }
);

export default User;
