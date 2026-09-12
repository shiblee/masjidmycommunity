import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Presence of a row = A (followerId) follows B (followingId). One-directional,
// same shape as MasjidFavorite -- a mutual follow is just two rows, not a
// separate "connection" concept.
const Follow = sequelize.define(
  "Follow",
  {
    followerId: { type: DataTypes.INTEGER, allowNull: false },
    followingId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "follows",
    indexes: [
      { unique: true, fields: ["followerId", "followingId"], name: "follows_follower_following_unique" },
      { fields: ["followingId"], name: "follows_following_id_idx" },
    ],
  }
);

export default Follow;
