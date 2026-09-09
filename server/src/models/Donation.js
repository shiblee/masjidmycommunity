import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Two ways a Donation row comes to exist, until a real payment gateway
// replaces both: (1) an admin directly records a confirmed transfer
// (recordedBy set, status "recorded" immediately), or (2) a donor
// self-reports one from the public Donate flow (recordedBy null, status
// "pending" — a claim, not a confirmation). Campaign.amountRaised/donorCount
// only ever sum status:"recorded" rows (see amountRaised() in
// campaignController.js), so a pending claim never inflates a campaign's
// public total until an admin reviews and confirms it (or declines it).
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
    // A snapshot of the campaign's classification at the time this donation
    // was recorded — a plain string (not a master-data FK) since it's never
    // independently edited, just copied from Campaign.donationType.
    donationType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "General Sadaqah",
    },
    status: {
      type: DataTypes.ENUM("recorded", "pending", "declined", "refunded", "disputed"),
      allowNull: false,
      defaultValue: "recorded",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    // Null for a donor's own self-reported (pending) claim — set to the
    // confirming/recording admin's id once it's reviewed either way.
    recordedBy: { type: DataTypes.INTEGER, allowNull: true },
    // The logged-in user who submitted a self-reported claim (the public
    // Donate flow requires sign-in specifically so this is always a real,
    // accountable account — never null for a donor-submitted row). Null for
    // an admin-recorded donation, which has no donor account involved.
    userId: { type: DataTypes.INTEGER, allowNull: true },
    // The donor's own preference, set once at donation time and never
    // inferred from a blank name. donorName/donorEmail always hold the real
    // identity regardless of this flag — payment/compliance/accounting/audit
    // needs the real record; this only controls whether *public* displays
    // (donor list, campaign page) show that name or "Anonymous" in its place.
    isAnonymous: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Set once, the first time a receipt PDF is generated for this donation
    // (donationReceiptService.js) — kept so every later re-send (or a
    // reprint) reuses the exact same receipt number and file instead of
    // minting a new one, even though the PDF shows "Anonymous" here too
    // when isAnonymous is set, same as every other public-facing surface.
    receiptNumber: { type: DataTypes.STRING, allowNull: true },
    receiptUrl: { type: DataTypes.STRING, allowNull: true },
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
