import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommentVote = sequelize.define(
  "CommentVote",
  {
    commentId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.ENUM("like", "dislike"), allowNull: false },
  },
  {
    tableName: "comment_votes",
    indexes: [{ unique: true, fields: ["commentId", "userId"], name: "comment_votes_unique" }],
  }
);

export default CommentVote;
