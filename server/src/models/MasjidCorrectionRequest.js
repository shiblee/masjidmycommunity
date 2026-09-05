import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per user submission, which may bundle corrections to several
// fields at once. `status` is a cached rollup of its MasjidCorrectionField
// rows' statuses (see adminMasjidCorrectionController.recomputeStatus),
// recomputed every time a field is decided — kept here so the admin list
// doesn't need a join/aggregate on every fetch.
const MasjidCorrectionRequest = sequelize.define(
  "MasjidCorrectionRequest",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "partially_approved", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "masjid_correction_requests",
    indexes: [{ fields: ["masjidId"], name: "masjid_correction_requests_masjid_id_idx" }],
  }
);

export default MasjidCorrectionRequest;
