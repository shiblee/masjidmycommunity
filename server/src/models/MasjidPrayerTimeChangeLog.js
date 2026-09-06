import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Dedicated audit trail for prayer-time edits — neither MasjidHistory
// (freeform note, no old/new columns) nor MetaChangeLog (built for global
// admin-list entities, not per-masjid+per-prayer+per-date values) fit this
// cleanly, so this borrows MetaChangeLogPanel's old/new-value display
// convention in a small table shaped for this specific data.
const MasjidPrayerTimeChangeLog = sequelize.define(
  "MasjidPrayerTimeChangeLog",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    prayerId: { type: DataTypes.INTEGER, allowNull: false },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
    changeType: { type: DataTypes.ENUM("recurring_rule", "date_override"), allowNull: false },
    oldValue: { type: DataTypes.STRING, allowNull: true },
    newValue: { type: DataTypes.STRING, allowNull: false },
    actorType: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "masjid_prayer_time_change_logs",
    indexes: [{ fields: ["masjidId"], name: "masjid_prayer_time_change_logs_masjid" }],
  }
);

export default MasjidPrayerTimeChangeLog;
