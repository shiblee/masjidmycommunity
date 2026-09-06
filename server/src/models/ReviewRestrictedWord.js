import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Admin-maintained library of restricted terms/phrases — the single source
// of truth shared by Reviews AND Masjid text fields (Name/Tagline/About,
// see utils/contentModeration.js). Never exposed to end users: only whether
// a submission was flagged, never which term matched.
//
// One row = one moderation *concept*, not one word in one language — e.g. a
// single row can carry the English, Hindi, Urdu and Arabic forms of the
// same restricted idea together, plus any number of extra spellings/
// transliterations in `variants` (free text, any script — there is no
// automatic phonetic Hindi/Urdu/Arabic-to-Roman conversion; an admin
// registers the romanized form explicitly if they want it caught).
const ReviewRestrictedWord = sequelize.define(
  "ReviewRestrictedWord",
  {
    category: {
      type: DataTypes.ENUM("Vulgar/Abusive", "Sexual/Explicit", "Hate/Harassment", "Threatening", "Offensive", "Other"),
      allowNull: false,
      defaultValue: "Other",
    },
    textEn: { type: DataTypes.STRING(500), allowNull: true },
    textHi: { type: DataTypes.STRING(500), allowNull: true },
    textUr: { type: DataTypes.STRING(500), allowNull: true },
    textAr: { type: DataTypes.STRING(500), allowNull: true },
    // Extra spellings, common misspellings, or romanized/transliterated
    // forms an admin wants caught alongside the four language fields above.
    variants: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    // Controls how aggressively this entry is matched — see
    // contentModeration.js for exactly what each tier does.
    detectionType: {
      type: DataTypes.ENUM("exact", "phrase", "variation", "obfuscation", "ai"),
      allowNull: false,
      defaultValue: "obfuscation",
    },
    // Informational for now (surfaced to admins; doesn't yet change how a
    // match is handled) — reserved so severity-based routing (e.g. block
    // outright vs. send low-severity hits to admin review) can be added
    // without another schema change.
    severity: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      allowNull: false,
      defaultValue: "high",
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "review_restricted_words",
  }
);

export default ReviewRestrictedWord;
