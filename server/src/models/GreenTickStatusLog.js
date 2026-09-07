import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Audit trail for the whole Green Tick pipeline — one table serves the
// overall application timeline (representativeId/documentId both null) AND
// per-representative/per-document history (filter by those columns), so
// there's one coherent "every important action recorded" log rather than
// three parallel ones.
const GreenTickStatusLog = sequelize.define(
  "GreenTickStatusLog",
  {
    applicationId: { type: DataTypes.INTEGER, allowNull: false },
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    representativeId: { type: DataTypes.INTEGER, allowNull: true },
    documentId: { type: DataTypes.INTEGER, allowNull: true },
    previousStatus: { type: DataTypes.STRING, allowNull: true },
    newStatus: { type: DataTypes.STRING, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false },
    actorType: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "green_tick_status_logs",
    indexes: [
      { fields: ["applicationId"], name: "green_tick_status_logs_application_idx" },
      { fields: ["masjidId"], name: "green_tick_status_logs_masjid_idx" },
    ],
  }
);

export default GreenTickStatusLog;
