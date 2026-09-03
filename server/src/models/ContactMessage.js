import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Reference is a short human-friendly code (e.g. CONTACT-7F3K2Q) shown to the
// submitter in their acknowledgement email — mirrors Concern's reference.
const ContactMessage = sequelize.define(
  "ContactMessage",
  {
    reference: { type: DataTypes.STRING, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    // Raw topic key (e.g. "masjid", "campaign") — display label is derived
    // client-side / at email-send time, not stored, so relabeling a topic
    // doesn't require a migration.
    topic: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },

    status: {
      type: DataTypes.ENUM("open", "in_progress", "closed"),
      allowNull: false,
      defaultValue: "open",
    },
    closedBy: { type: DataTypes.STRING, allowNull: true },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    closingRemarks: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "contact_messages",
    indexes: [
      { unique: true, fields: ["reference"], name: "contact_messages_reference_unique" },
      { fields: ["status"], name: "contact_messages_status_idx" },
    ],
  }
);

export default ContactMessage;
