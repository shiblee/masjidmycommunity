import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per page view. "Total Views" everywhere (public masjid page,
// popup, admin) is just a COUNT of this table via masjidEngagementService —
// but every view is logged in full so a later trend/analytics feature (views
// over time, by source, by returning visitor) has real data to work from
// instead of a single running counter.
const MasjidView = sequelize.define(
  "MasjidView",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    source: { type: DataTypes.ENUM("detail", "popup"), allowNull: false },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.STRING(512), allowNull: true },
    referrer: { type: DataTypes.STRING(512), allowNull: true },
  },
  {
    tableName: "masjid_views",
    indexes: [
      { fields: ["masjidId"], name: "masjid_views_masjid_id_idx" },
      { fields: ["createdAt"], name: "masjid_views_created_at_idx" },
    ],
  }
);

export default MasjidView;
