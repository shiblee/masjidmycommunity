import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per (key, language) — e.g. ("nav.exploreCampaigns", "hi"). Flat
// rather than a normalized key/value split so both "all values for this key"
// (admin edit grid) and "the whole map for this language" (frontend fetch)
// are a single simple query.
const Translation = sequelize.define(
  "Translation",
  {
    key: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    languageCode: { type: DataTypes.STRING(10), allowNull: false },
    value: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: "translations",
    indexes: [
      { unique: true, fields: ["key", "languageCode"], name: "translations_key_language_unique" },
      { fields: ["category"], name: "translations_category_idx" },
      { fields: ["languageCode"], name: "translations_language_code_idx" },
    ],
  }
);

export default Translation;
