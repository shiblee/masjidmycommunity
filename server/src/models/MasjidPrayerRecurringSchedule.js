import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// The "Base Date Rule" half of the roster: one row per (masjid, prayer,
// calendar month/day) holds the DEFAULT timing applied to that day in
// EVERY year, unless MasjidPrayerDateOverride has an exception for that
// exact date. Deliberately keyed by month+day, not a full date, so this
// never turns into "thousands of yearly records" — one row covers every
// future (and past) occurrence of that calendar day.
//
// `originDate` is the exact date the masjid was viewing/editing when they
// last saved this as a recurring change — lets the UI tell "you're looking
// at the year you actually set this on" (label: Manually Set) apart from
// "this is inherited from a rule set in a different year" (label:
// Recurring Roster). See prayerTimeService.js.
const MasjidPrayerRecurringSchedule = sequelize.define(
  "MasjidPrayerRecurringSchedule",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    prayerId: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false }, // 1-12
    day: { type: DataTypes.INTEGER, allowNull: false }, // 1-31
    time: { type: DataTypes.STRING, allowNull: false }, // "HH:mm", 24-hour, masjid-local wall-clock time
    originDate: { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    tableName: "masjid_prayer_recurring_schedules",
    indexes: [
      { unique: true, fields: ["masjidId", "prayerId", "month", "day"], name: "masjid_prayer_recurring_unique" },
    ],
  }
);

export default MasjidPrayerRecurringSchedule;
