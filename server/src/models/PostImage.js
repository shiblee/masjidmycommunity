import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A single image within a Wall post — its own row (and own ID) so likes,
// dislikes, comments, and reports can all be scoped to this exact image
// rather than the post as a whole.
const PostImage = sequelize.define(
  "PostImage",
  {
    activityId: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // Mirrors Comment's status field — "hidden" removes it from the post's
    // gallery entirely (admin moderation / auto-hide at report threshold).
    status: { type: DataTypes.ENUM("visible", "hidden"), allowNull: false, defaultValue: "visible" },
    reportCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "post_images",
    indexes: [{ fields: ["activityId"], name: "post_images_activity_id_idx" }],
  }
);

export default PostImage;
