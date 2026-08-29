import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A single node in a Wall post's discussion thread. parentId is a
// self-reference — null for a top-level comment, set for a reply to any
// comment or reply at any depth, so the tree has no fixed depth limit.
const Comment = sequelize.define(
  "Comment",
  {
    activityId: { type: DataTypes.INTEGER, allowNull: false },
    // Set only for a comment on a specific image within the post — keeps
    // that discussion in its own thread, separate from the post's general
    // comments, even though both reference the same activityId for context.
    imageId: { type: DataTypes.INTEGER, allowNull: true },
    parentId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },

    // "deleted" = the author removed it themselves (row kept, body cleared,
    // rendered as a placeholder so replies underneath stay attached to a
    // real thread position). "hidden" = removed by admin moderation, or
    // auto-hidden after crossing the report threshold.
    status: { type: DataTypes.ENUM("visible", "hidden", "deleted"), allowNull: false, defaultValue: "visible" },
    reportCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "comments",
    indexes: [
      { fields: ["activityId"], name: "comments_activity_id_idx" },
      { fields: ["imageId"], name: "comments_image_id_idx" },
      { fields: ["parentId"], name: "comments_parent_id_idx" },
    ],
  }
);

export default Comment;
