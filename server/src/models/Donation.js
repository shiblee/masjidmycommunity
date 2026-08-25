import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Donations are admin-recorded confirmations of transfers that happened
// outside the platform (no payment gateway integration exists yet) — never
// user-submitted, and Campaign.amountRaised is always derived by summing
// these rather than stored, so it can never be edited directly by a creator.
const Donation = sequelize.define(
  "Donation",
  {
    campaignId: { type: DataTypes.INTEGER, allowNull: false },
    donorName: { type: DataTypes.STRING, allowNull: true },
    donorEmail: { type: DataTypes.STRING, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "INR" },
    method: {
      type: DataTypes.ENUM("bank_transfer", "upi", "cash", "cheque", "other"),
      allowNull: false,
      defaultValue: "upi",
    },
    donationType: {
      type: DataTypes.ENUM("general_sadaqah", "zakat", "waqf", "other"),
      allowNull: false,
      defaultValue: "general_sadaqah",
    },
    status: {
      type: DataTypes.ENUM("recorded", "refunded", "disputed"),
      allowNull: false,
      defaultValue: "recorded",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    recordedBy: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "donations",
    indexes: [
      { fields: ["campaignId"], name: "donations_campaign_id_idx" },
      { fields: ["status"], name: "donations_status_idx" },
    ],
  }
);

export default Donation;
