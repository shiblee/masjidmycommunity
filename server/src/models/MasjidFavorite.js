import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Presence of a row = favorited; no separate status needed. One row per
// user per masjid, same shape as MasjidReview's uniqueness guarantee.
const MasjidFavorite = sequelize.define(
  "MasjidFavorite",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "masjid_favorites",
    indexes: [
      { unique: true, fields: ["masjidId", "userId"], name: "masjid_favorites_masjid_user_unique" },
      { fields: ["userId"], name: "masjid_favorites_user_id_idx" },
    ],
  }
);

export default MasjidFavorite;
