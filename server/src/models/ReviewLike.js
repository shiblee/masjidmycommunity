import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per user who found a review helpful — mirrors MasjidFavorite's
// shape (a pure boolean-presence join table, no extra columns needed).
const ReviewLike = sequelize.define(
  "ReviewLike",
  {
    reviewId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "review_likes",
    indexes: [
      { unique: true, fields: ["reviewId", "userId"], name: "review_likes_review_user_unique" },
      { fields: ["reviewId"], name: "review_likes_review_id_idx" },
    ],
  }
);

export default ReviewLike;
