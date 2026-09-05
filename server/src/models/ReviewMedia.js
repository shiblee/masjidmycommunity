import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per photo/video attached to a review — mirrors MasjidPhoto's shape.
const ReviewMedia = sequelize.define(
  "ReviewMedia",
  {
    reviewId: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    mediaType: { type: DataTypes.ENUM("photo", "video"), allowNull: false, defaultValue: "photo" },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "review_media",
    indexes: [{ fields: ["reviewId"], name: "review_media_review_id_idx" }],
  }
);

export default ReviewMedia;
