import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommunityActivityVote = sequelize.define(
  "CommunityActivityVote",
  {
    activityId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.ENUM("like", "dislike"), allowNull: false },
  },
  {
    tableName: "community_activity_votes",
    indexes: [{ unique: true, fields: ["activityId", "userId"], name: "community_activity_votes_unique" }],
  }
);

export default CommunityActivityVote;
