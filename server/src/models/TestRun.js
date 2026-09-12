import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per "Run Tests" click in the Admin Panel's Testing page -- a real
// `vitest run` execution (see adminTestingController.js), not a simulated
// result. resultsJson holds the full per-module, per-test breakdown so the
// history stays inspectable, not just the rolled-up pass/fail count.
const TestRun = sequelize.define(
  "TestRun",
  {
    overallStatus: { type: DataTypes.ENUM("passed", "failed"), allowNull: false },
    totalTests: { type: DataTypes.INTEGER, allowNull: false },
    passedTests: { type: DataTypes.INTEGER, allowNull: false },
    failedTests: { type: DataTypes.INTEGER, allowNull: false },
    resultsJson: { type: DataTypes.JSON, allowNull: false },
    durationMs: { type: DataTypes.INTEGER, allowNull: false },
    triggeredByName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "test_runs",
    indexes: [{ fields: ["createdAt"], name: "test_runs_created_at_idx" }],
  }
);

export default TestRun;
