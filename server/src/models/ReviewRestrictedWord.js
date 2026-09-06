import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Admin-maintained library of restricted terms/phrases — the single source
// of truth shared by reviews AND masjid text fields (Name/Tagline/About, see
// utils/contentModeration.js). Never exposed to end users: only whether a
// submission was flagged, never which term matched.
const ReviewRestrictedWord = sequelize.define(
  "ReviewRestrictedWord",
  {
    term: { type: DataTypes.STRING, allowNull: false },
    category: {
      type: DataTypes.ENUM("Vulgar/Abusive", "Sexual/Explicit", "Hate/Harassment", "Threatening", "Offensive", "Other"),
      allowNull: false,
      defaultValue: "Other",
    },
    language: { type: DataTypes.ENUM("en", "hi", "ur", "ar", "other"), allowNull: false, defaultValue: "en" },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "review_restricted_words",
    indexes: [
      { unique: true, fields: ["term", "language"], name: "review_restricted_words_term_lang_unique" },
    ],
  }
);

export default ReviewRestrictedWord;
