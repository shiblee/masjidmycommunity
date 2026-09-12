import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per "Run Health Check" click in the Admin Panel's System Health
// page -- a real, on-demand smoke test (live DB query + live public API
// requests + this Node process's own metrics), not a simulated/fabricated
// result. checksJson holds the full per-check detail so history stays
// inspectable, not just the rolled-up status.
const HealthCheckRun = sequelize.define(
  "HealthCheckRun",
  {
    overallStatus: { type: DataTypes.ENUM("healthy", "degraded", "critical"), allowNull: false },
    checksJson: { type: DataTypes.JSON, allowNull: false },
    durationMs: { type: DataTypes.INTEGER, allowNull: false },
    triggeredByName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "health_check_runs",
    indexes: [{ fields: ["createdAt"], name: "health_check_runs_created_at_idx" }],
  }
);

export default HealthCheckRun;
