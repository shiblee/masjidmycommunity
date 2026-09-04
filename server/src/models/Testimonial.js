import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// English author name/designation/quote live directly on the row; hi/ur/ar
// translations of the quote and designation reuse the global Translation
// table via entity keys "testimonial.quote.<id>" / "testimonial.designation.<id>",
// category "testimonial" — same mechanism Faq uses via TranslateFieldsModal.
// authorName is a proper noun and is never translated.
const Testimonial = sequelize.define(
  "Testimonial",
  {
    authorName: { type: DataTypes.STRING, allowNull: false },
    // Role/location line shown under the name, e.g. "Masjid Committee Chair, Nairobi".
    designation: { type: DataTypes.STRING, allowNull: true },
    photoUrl: { type: DataTypes.STRING, allowNull: true },
    quote: { type: DataTypes.TEXT, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
    testimonialDate: { type: DataTypes.DATEONLY, allowNull: true },
    isFeatured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "testimonials",
    indexes: [
      { fields: ["isActive"], name: "testimonials_is_active_idx" },
      { fields: ["isFeatured"], name: "testimonials_is_featured_idx" },
    ],
  }
);

export default Testimonial;
