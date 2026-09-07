import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A prayer time is effective from the date it's set until the next change —
// within a year that means "continuously forward"; across a year boundary,
// a date with no explicit row of its own inherits the previous year's
// forward-filled value for that SAME calendar date (see
// prayerTimeService.js's getEffectivePrayerTimes for the algorithm). This
// is the single source of truth for every prayer-time edit — there is no
// separate "recurring rule" vs "override" concept anymore.
const MasjidPrayerTimeline = sequelize.define(
  "MasjidPrayerTimeline",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    prayerId: { type: DataTypes.INTEGER, allowNull: false },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.STRING, allowNull: false }, // "HH:mm"
  },
  {
    tableName: "masjid_prayer_timelines",
    indexes: [
      { unique: true, fields: ["masjidId", "prayerId", "effectiveDate"], name: "masjid_prayer_timeline_unique" },
    ],
  }
);

export default MasjidPrayerTimeline;
