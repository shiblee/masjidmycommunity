import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// English title/summary/story/highlights live directly on the row; hi/ur/ar
// translations reuse the global Translation table via entity keys
// "successStory.<field>.<id>", category "successStory" — same mechanism
// Faq/Testimonial use via TranslateFieldsModal. masjidName/location are
// proper nouns and are never translated.
const SuccessStory = sequelize.define(
  "SuccessStory",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: false },
    story: { type: DataTypes.TEXT, allowNull: false },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    masjidName: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    // Newline-separated short highlight lines (e.g. "640 donors across 22
    // countries") — rendered as a bullet/chip list, kept as one free-text
    // field rather than a fixed set of stat inputs so a story can carry as
    // many or as few highlights as make sense for it.
    highlights: { type: DataTypes.TEXT, allowNull: true },
    isFeatured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "success_stories",
    indexes: [
      { unique: true, fields: ["slug"], name: "success_stories_slug_unique" },
      { fields: ["isActive"], name: "success_stories_is_active_idx" },
      { fields: ["isFeatured"], name: "success_stories_is_featured_idx" },
    ],
  }
);

export default SuccessStory;
