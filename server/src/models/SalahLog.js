import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A row's mere existence means that prayer was marked done — no separate
// boolean. Deliberately has NO masjidId: prayerId points at the global
// PrayerMaster row (Fajr/Dhuhr/Asr/Maghrib/Isha are shared across every
// masjid), so a user's history stays intact and unaffected when they change
// their Primary Masjid later — nothing here needs to know which masjid the
// prayer was tracked against.
const SalahLog = sequelize.define(
  "SalahLog",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    prayerId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    completedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "salah_logs",
    indexes: [{ unique: true, fields: ["userId", "prayerId", "date"], name: "salah_log_unique" }],
  }
);

export default SalahLog;
