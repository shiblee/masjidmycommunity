import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Masjid = sequelize.define(
  "Masjid",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },

    name: { type: DataTypes.STRING, allowNull: false },
    tagline: { type: DataTypes.STRING, allowNull: true },
    about: { type: DataTypes.TEXT, allowNull: true },
    yearEstablished: { type: DataTypes.STRING, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: true },

    address: { type: DataTypes.STRING, allowNull: true },
    area: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    district: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },
    postalCode: { type: DataTypes.STRING, allowNull: true },
    mapLink: { type: DataTypes.STRING, allowNull: true },
    formattedAddress: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },

    imamName: { type: DataTypes.STRING, allowNull: true },
    contactMobile: { type: DataTypes.STRING, allowNull: true },
    contactEmail: { type: DataTypes.STRING, allowNull: true },
    mobileVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    otpCode: { type: DataTypes.STRING, allowNull: true },
    otpExpiresAt: { type: DataTypes.DATE, allowNull: true },
    otpTarget: { type: DataTypes.ENUM("email", "mobile"), allowNull: true },
    otpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    status: {
      type: DataTypes.ENUM("draft", "submitted", "under_review", "changes_requested", "approved", "rejected", "inactive"),
      allowNull: false,
      defaultValue: "draft",
    },
    adminFeedback: { type: DataTypes.TEXT, allowNull: true },

    submittedAt: { type: DataTypes.DATE, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "masjids",
    indexes: [
      { fields: ["userId"], name: "masjids_user_id_idx" },
      { fields: ["status"], name: "masjids_status_idx" },
    ],
  }
);

export default Masjid;
