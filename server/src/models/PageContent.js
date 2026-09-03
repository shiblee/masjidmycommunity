import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per (page, language) — the page's title and rich-text body HTML
// in that language. Kept flat like Translation rather than a JSON blob on
// Page so "give me this page in this language" and "which languages does
// this page have content for" are both single simple queries.
const PageContent = sequelize.define(
  "PageContent",
  {
    pageId: { type: DataTypes.INTEGER, allowNull: false },
    languageCode: { type: DataTypes.STRING(10), allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    bodyHtml: { type: DataTypes.TEXT("long"), allowNull: false },
  },
  {
    tableName: "page_contents",
    indexes: [
      { unique: true, fields: ["pageId", "languageCode"], name: "page_contents_page_language_unique" },
      { fields: ["languageCode"], name: "page_contents_language_code_idx" },
    ],
  }
);

export default PageContent;
