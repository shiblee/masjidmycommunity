import React, { useEffect, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

// A real on-demand smoke test, not a simulated dashboard: "Run Health
// Check" makes actual requests to this app's own public API endpoints,
// runs a real DB query, and reads this Node process's own metrics -- see
// server/src/controllers/adminHealthController.js. No load/stress testing,
// no fabricated pass counts, no auto-fix -- just an honest, safe check of
// whether the real things it touches are actually working right now.

const OVERALL_BADGE = {
  healthy: { status: "active", label: "Healthy" },
  degraded: { status: "changes_requested", label: "Degraded" },
  critical: { status: "rejected", label: "Critical" },
};

const CHECK_BADGE = {
  pass: { status: "active", label: "Pass" },
  degraded: { status: "changes_requested", label: "Slow" },
  fail: { status: "rejected", label: "Fail" },
};

const CATEGORY_LABEL = { database: "Database", api: "API", process: "Process" };

function CheckList({ checks }) {
  return (
    <table className="amx-table" style={{ marginTop: 16 }}>
      <thead>
        <tr>
          <th>Check</th>
          <th>Category</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        {checks.map((c, i) => {
          const badge = CHECK_BADGE[c.status] || CHECK_BADGE.fail;
          return (
            <tr key={i}>
              <td>{c.name}</td>
              <td className="amx-panel-sub">{CATEGORY_LABEL[c.category] || c.category}</td>
              <td><StatusBadge status={badge.status} label={badge.label} /></td>
              <td>{c.durationMs}ms</td>
              <td className="amx-panel-sub">{c.detail || "&mdash;"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SystemHealth() {
  const [runs, setRuns] = useState(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);

  const load = () => {
    adminApi
      .get("/health/runs")
      .then(({ data }) => setRuns(data.runs))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load health check history."));
  };

  useEffect(load, []);

  const runCheck = async () => {
    setRunning(true);
    setError("");
    try {
      const { data } = await adminApi.post("/health/run");
      setRuns((rs) => [data.run, ...(rs || [])]);
      setSelectedRunId(data.run.id);
    } catch (err) {
      setError(err.response?.data?.message || "Health check failed to run.");
    } finally {
      setRunning(false);
    }
  };

  const selectedRun = runs?.find((r) => r.id === selectedRunId) || runs?.[0];

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration &middot; Developer</span>
          <h1>System Health</h1>
          <p>An on-demand, real smoke test &mdash; live public API requests, a live database query, and this process's own metrics.</p>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={runCheck} disabled={running}>
          <Icon name="rotate" size={15} /> {running ? "Running…" : "Run Health Check"}
        </button>
      </div>

      {error && (
        <div className="amx-form-error" style={{ marginBottom: 20 }}>
          <Icon name="info" size={17} />
          {error}
        </div>
      )}

      {runs === null ? (
        <div className="amx-empty">
          <Icon name="activity" />
          <strong>Loading…</strong>
        </div>
      ) : runs.length === 0 ? (
        <div className="amx-empty">
          <Icon name="activity" />
          <strong>No health checks run yet</strong>
          <span>Click "Run Health Check" to check the live application right now.</span>
        </div>
      ) : (
        <div className="amx-grid-2">
          <div className="amx-card amx-panel">
            <div className="amx-panel-head">
              <h3>
                {selectedRun.id === runs[0].id ? "Latest Run" : `Run from ${formatDate(selectedRun.createdAt)}`}
              </h3>
              <StatusBadge {...(OVERALL_BADGE[selectedRun.overallStatus] || OVERALL_BADGE.critical)} />
            </div>
            <p className="amx-panel-sub">
              {formatDate(selectedRun.createdAt)} &middot; took {selectedRun.durationMs}ms &middot; triggered by {selectedRun.triggeredByName || "Unknown"}
            </p>
            <CheckList checks={selectedRun.checksJson} />
          </div>

          <div className="amx-card amx-panel">
            <h3 style={{ marginBottom: 14 }}>History</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {runs.map((r) => {
                const badge = OVERALL_BADGE[r.overallStatus] || OVERALL_BADGE.critical;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRunId(r.id)}
                      className={`amx-health-history-item${r.id === selectedRun.id ? " active" : ""}`}
                    >
                      <span>{formatDate(r.createdAt)}</span>
                      <StatusBadge status={badge.status} label={badge.label} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export default SystemHealth;
