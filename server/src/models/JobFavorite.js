import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// File-for-file mirror of MasjidFavorite — presence of a row = saved; no
// separate status needed. One row per user per job.
const JobFavorite = sequelize.define(
  "JobFavorite",
  {
    jobId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "job_favorites",
    indexes: [
      { unique: true, fields: ["jobId", "userId"], name: "job_favorites_job_user_unique" },
      { fields: ["userId"], name: "job_favorites_user_id_idx" },
    ],
  }
);

export default JobFavorite;
