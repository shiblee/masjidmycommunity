import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Master list of reasons offered when a user deletes their own Reel —
// mirrors DeletionReason.js (masjid deletion) exactly, kept as its own
// model since the two option sets are unrelated.
const ReelDeletionReason = sequelize.define(
  "ReelDeletionReason",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "reel_deletion_reasons",
    indexes: [{ unique: true, fields: ["name"], name: "reel_deletion_reasons_name_unique" }],
  }
);

export default ReelDeletionReason;
