import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const PostImageVote = sequelize.define(
  "PostImageVote",
  {
    imageId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.ENUM("like", "dislike"), allowNull: false },
  },
  {
    tableName: "post_image_votes",
    indexes: [{ unique: true, fields: ["imageId", "userId"], name: "post_image_votes_unique" }],
  }
);

export default PostImageVote;
