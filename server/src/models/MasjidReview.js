import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One review per user per masjid (unique masjidId+userId) — posting again
// edits the existing row rather than creating a second one, same model
// Google Maps itself uses. "hidden" is an admin moderation action, mirroring
// Comment.js's status field for exactly the same reason: shipping public
// user-generated text needs at least a basic on/off moderation switch.
const MasjidReview = sequelize.define(
  "MasjidReview",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    // "pending" = held for admin review after the AI moderation layer (see
    // aiProviderService.classifyReviewContent) returned a non-"safe"
    // classification that wasn't already rejected outright by the rule-based
    // restricted-word filter. Public queries only ever select "visible".
    status: { type: DataTypes.ENUM("visible", "hidden", "pending"), allowNull: false, defaultValue: "visible" },
    // Set only for "pending" reviews — a short admin-facing label like
    // "AI: sexual" so PendingReviews.jsx can show *why* without ever
    // exposing the restricted-word library itself.
    flagReason: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "masjid_reviews",
    indexes: [
      { unique: true, fields: ["masjidId", "userId"], name: "masjid_reviews_masjid_user_unique" },
      { fields: ["masjidId"], name: "masjid_reviews_masjid_id_idx" },
    ],
  }
);

export default MasjidReview;
