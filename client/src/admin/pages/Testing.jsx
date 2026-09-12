import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

// A real test-run dashboard, not a simulated one: "Run Tests" spawns an
// actual `vitest run` on the server (see adminTestingController.js), which
// makes real requests against the live API for every test in
// server/tests/ -- takes up to ~2 minutes. Module tabs mirror the
// Documentation page exactly; a module with no test file mapped in
// server/src/config/testModuleFiles.js is shown honestly as untested,
// never padded with a fake result.

function ResultIcon({ status }) {
  if (status === "passed") return <span style={{ color: "var(--a-green-deep)" }}><Icon name="check" size={14} /></span>;
  return <span style={{ color: "var(--a-danger)" }}><Icon name="x" size={14} /></span>;
}

function ModuleTestPanel({ module, latestResult }) {
  if (!latestResult) {
    return (
      <div className="amx-empty">
        <Icon name="code" />
        <strong>No automated tests yet</strong>
        <span>{module.title} doesn't have a test file mapped in server/src/config/testModuleFiles.js.</span>
      </div>
    );
  }

  return (
    <div>
      <div className="amx-panel-head">
        <h3>{module.title}</h3>
        <span className="amx-panel-sub">{latestResult.tests.filter((t) => t.status === "passed").length}/{latestResult.tests.length} passed</span>
      </div>
      <table className="amx-table">
        <thead>
          <tr>
            <th></th>
            <th>Test</th>
            <th>Duration</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {latestResult.tests.map((t, i) => (
            <tr key={i}>
              <td><ResultIcon status={t.status} /></td>
              <td>{t.title}</td>
              <td className="amx-panel-sub">{t.durationMs}ms</td>
              <td className="amx-panel-sub" style={{ color: t.failureMessage ? "var(--a-danger)" : undefined }}>{t.failureMessage || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Testing() {
  const { moduleKey } = useParams();
  const navigate = useNavigate();
  const [modules, setModules] = useState(null);
  const [runs, setRuns] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([adminApi.get("/developer/modules"), adminApi.get("/testing/runs")])
      .then(([modRes, runRes]) => {
        setModules(modRes.data.modules);
        setRuns(runRes.data.runs);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load testing data."));
  };

  useEffect(load, []);

  const runTests = async () => {
    setRunning(true);
    setError("");
    try {
      const { data } = await adminApi.post("/testing/run");
      setRuns((rs) => [data.run, ...(rs || [])]);
    } catch (err) {
      setError(err.response?.data?.message || "Test run failed.");
    } finally {
      setRunning(false);
    }
  };

  const latestRun = runs?.[0] || null;
  const resultByModuleKey = useMemo(() => {
    if (!latestRun) return new Map();
    return new Map(latestRun.resultsJson.filter((r) => r.moduleKey).map((r) => [r.moduleKey, r]));
  }, [latestRun]);

  const categorized = useMemo(() => {
    if (!modules) return [];
    const groups = new Map();
    for (const m of modules) {
      const cat = m.category || "Uncategorized";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(m);
    }
    return [...groups.entries()];
  }, [modules]);

  const testedCount = modules ? modules.filter((m) => resultByModuleKey.has(m.key)).length : 0;

  if (error) {
    return (
      <div className="amx-form-error">
        <Icon name="info" size={17} />
        {error}
      </div>
    );
  }

  if (!modules || !runs) {
    return (
      <div className="amx-empty">
        <Icon name="code" />
        <strong>Loading…</strong>
      </div>
    );
  }

  const activeModule = modules.find((m) => m.key === moduleKey) || modules[0];
  const activeResult = resultByModuleKey.get(activeModule.key) || null;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration &middot; Developer</span>
          <h1>Automated Testing</h1>
          <p>Real test runs against the live API — see server/tests/. Each run makes real requests and cleans up after itself; results below are exactly what ran, nothing simulated.</p>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={runTests} disabled={running}>
          <Icon name="rotate" size={15} /> {running ? "Running… (up to ~2 min)" : "Run Tests"}
        </button>
      </div>

      <div className="amx-grid-2" style={{ marginBottom: 24 }}>
        <div className="amx-card amx-panel">
          <h3 style={{ marginBottom: 14 }}>Current Status</h3>
          {latestRun ? (
            <>
              <div className="amx-stat-tiles" style={{ marginBottom: 14 }}>
                <div className="amx-stat-tile"><strong>{latestRun.totalTests}</strong><span>Total Tests</span></div>
                <div className="amx-stat-tile"><strong>{latestRun.passedTests}</strong><span>Passed</span></div>
                <div className="amx-stat-tile"><strong>{latestRun.failedTests}</strong><span>Failed</span></div>
                <div className="amx-stat-tile"><strong>{testedCount}/{modules.length}</strong><span>Modules Covered</span></div>
              </div>
              <StatusBadge status={latestRun.overallStatus === "passed" ? "active" : "rejected"} label={latestRun.overallStatus === "passed" ? "All Passing" : "Failures Found"} />
              <span className="amx-panel-sub" style={{ marginLeft: 10 }}>
                Last run {formatDate(latestRun.createdAt)} &middot; took {(latestRun.durationMs / 1000).toFixed(1)}s &middot; by {latestRun.triggeredByName || "Unknown"}
              </span>
            </>
          ) : (
            <p className="amx-panel-sub">No test runs yet — click "Run Tests" to check the live application right now.</p>
          )}
        </div>

        <div className="amx-card amx-panel">
          <h3 style={{ marginBottom: 14 }}>History</h3>
          {runs.length === 0 ? (
            <p className="amx-panel-sub">No history yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {runs.slice(0, 8).map((r) => (
                <li key={r.id} className="amx-health-history-item">
                  <span>{formatDate(r.createdAt)}</span>
                  <span className="amx-panel-sub">{r.passedTests}/{r.totalTests} passed</span>
                  <StatusBadge status={r.overallStatus === "passed" ? "active" : "rejected"} label={r.overallStatus === "passed" ? "Passed" : "Failed"} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="amx-settings-layout">
        <nav className="amx-settings-nav">
          {categorized.map(([category, mods]) => (
            <div key={category} style={{ marginBottom: 8 }}>
              <div className="amx-panel-sub" style={{ padding: "8px 12px 4px", textTransform: "uppercase", letterSpacing: ".04em", fontSize: 11 }}>{category}</div>
              {mods.map((m) => {
                const result = resultByModuleKey.get(m.key);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={m.key === activeModule.key ? "active" : ""}
                    onClick={() => navigate(`/admin/testing/${m.key}`)}
                  >
                    {m.title}
                    {result ? (
                      <StatusBadge
                        status={result.tests.every((t) => t.status === "passed") ? "active" : "rejected"}
                        label={`${result.tests.filter((t) => t.status === "passed").length}/${result.tests.length}`}
                      />
                    ) : (
                      <StatusBadge status="neutral" label="No tests" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="amx-card amx-panel">
          <ModuleTestPanel module={activeModule} latestResult={activeResult} />
        </div>
      </div>
    </>
  );
}

export default Testing;
