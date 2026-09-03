import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Mirrors ContactTopic's shape (plain string category, no FK — matches the
// rest of this codebase's meta-entity pattern) plus fields specific to a
// Q&A row. English question/answer live directly on the row; hi/ur/ar
// translations reuse the global Translation table via entity keys
// "faq.question.<id>" / "faq.answer.<id>", category "faq" — same mechanism
// ContactTopic/ConcernType already use, via TranslateFieldsModal.
const Faq = sequelize.define(
  "Faq",
  {
    category: { type: DataTypes.STRING, allowNull: false },
    question: { type: DataTypes.TEXT, allowNull: false },
    answer: { type: DataTypes.TEXT, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: true },
    isFeatured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "faqs",
    indexes: [
      { fields: ["category"], name: "faqs_category_idx" },
      { fields: ["isActive"], name: "faqs_is_active_idx" },
      { fields: ["isFeatured"], name: "faqs_is_featured_idx" },
    ],
  }
);

export default Faq;
