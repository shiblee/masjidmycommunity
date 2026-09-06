import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// The "Date-Specific Override" half of the roster: one row per (masjid,
// prayer, exact calendar date) holds an EXCEPTION for that one date only —
// saving one of these never touches MasjidPrayerRecurringSchedule's base
// rule for that month/day. When present for a date, this always wins over
// the recurring rule (see prayerTimeService.js's effective-time priority).
const MasjidPrayerDateOverride = sequelize.define(
  "MasjidPrayerDateOverride",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    prayerId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING, allowNull: false }, // "HH:mm"
  },
  {
    tableName: "masjid_prayer_date_overrides",
    indexes: [
      { unique: true, fields: ["masjidId", "prayerId", "date"], name: "masjid_prayer_override_unique" },
    ],
  }
);

export default MasjidPrayerDateOverride;
