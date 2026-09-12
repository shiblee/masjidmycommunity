import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per "Run Tests" click in the Admin Panel's Testing page -- a real
// `vitest run` execution (see adminTestingController.js), not a simulated
// result. resultsJson holds the full per-module, per-test breakdown so the
// history stays inspectable, not just the rolled-up pass/fail count.
//
// The row is created up front with overallStatus:"running" and the numeric/
// JSON fields still null, then updated in place once the detached vitest
// process actually finishes -- the HTTP request that started it doesn't
// wait around, because the suite has grown past what the infrastructure's
// own ~60s reverse-proxy timeout allows for one synchronous request,
// independent of this app's own (much longer) internal timeout.
const TestRun = sequelize.define(
  "TestRun",
  {
    overallStatus: { type: DataTypes.ENUM("running", "passed", "failed", "error"), allowNull: false, defaultValue: "running" },
    totalTests: { type: DataTypes.INTEGER, allowNull: true },
    passedTests: { type: DataTypes.INTEGER, allowNull: true },
    failedTests: { type: DataTypes.INTEGER, allowNull: true },
    resultsJson: { type: DataTypes.JSON, allowNull: true },
    errorMessage: { type: DataTypes.STRING, allowNull: true },
    durationMs: { type: DataTypes.INTEGER, allowNull: true },
    triggeredByName: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "test_runs",
    indexes: [{ fields: ["createdAt"], name: "test_runs_created_at_idx" }],
  }
);

export default TestRun;
