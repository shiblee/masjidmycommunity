import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MasjidHistory = sequelize.define(
  "MasjidHistory",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    actorType: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "masjid_history",
    indexes: [{ fields: ["masjidId"], name: "masjid_history_masjid_id_idx" }],
  }
);

export default MasjidHistory;
