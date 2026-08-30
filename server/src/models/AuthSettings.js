import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — platform-wide OTP policy, applies to every
// otpPurpose (register, login, reset_password, update_contact).
const AuthSettings = sequelize.define(
  "AuthSettings",
  {
    otpExpiryMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    otpResendCooldownSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
    },
    otpMaxAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
  },
  {
    tableName: "auth_settings",
  }
);

export default AuthSettings;
