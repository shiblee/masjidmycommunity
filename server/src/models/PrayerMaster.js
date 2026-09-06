import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Admin-defined list of prayers a masjid can set timings for — never
// hardcode "Fajr"/"Dhuhr"/... in the roster logic, always query
// isActive:true here, ordered by sortOrder, so admins can add further
// prayers (e.g. Jumu'ah) later with no code change. Multilingual display
// name is intentionally NOT stored here — it's looked up via the existing
// Translation system using a "prayer.<slug of name>" key, with `name`
// itself serving as the English fallback (see prayerDefaults.js).
const PrayerMaster = sequelize.define(
  "PrayerMaster",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    // Optional free-text grouping, e.g. "Fard", "Sunnah", "Jumu'ah".
    category: { type: DataTypes.STRING, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "prayer_masters",
    indexes: [{ unique: true, fields: ["name"], name: "prayer_masters_name_unique" }],
  }
);

export default PrayerMaster;
