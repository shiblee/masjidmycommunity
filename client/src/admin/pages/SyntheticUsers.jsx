import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const PAGE_SIZE = 50;

function Kpi({ icon, color, value, label }) {
  return (
    <div className="amx-card amx-kpi">
      <div className="amx-kpi-top">
        <div className="amx-kpi-icon" style={{ background: `${color}1a`, color }}>
          <Icon name={icon} />
        </div>
      </div>
      <div>
        <div className="amx-kpi-value">{value}</div>
        <div className="amx-kpi-label">{label}</div>
      </div>
    </div>
  );
}

function SyntheticUsers() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [testRunning, setTestRunning] = useState(false);

  const loadStatus = () => {
    adminApi.get("/user-bot/status").then(({ data }) => setStatus(data)).catch(() => {});
  };

  const loadUsers = () => {
    setLoading(true);
    adminApi
      .get("/user-bot/users", { params: { page, pageSize: PAGE_SIZE } })
      .then(({ data }) => {
        setRows(data.rows);
        setTotal(data.total);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadStatus, []);
  useEffect(() => {
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);
  useEffect(loadUsers, [page]);

  const runTestUser = async () => {
    setTestRunning(true);
    try {
      await adminApi.post("/user-bot/test-run");
      loadStatus();
      loadUsers();
    } catch (err) {
      window.alert(err.response?.data?.message || "Couldn't generate a test user — check the configuration in Settings.");
    } finally {
      setTestRunning(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Users</span>
          <h1>Synthetic Users</h1>
          <p>Fully-populated bot user accounts for demo and testing — permanently flagged and excluded from genuine-user analytics</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center", gap: 10 }}>
          <span className="amx-btn amx-btn-outline amx-btn-sm" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "default" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: status?.enabled ? "#C9942C" : "var(--a-border)", flexShrink: 0 }} />
            User Bot: {status?.enabled ? "Running" : "Off"}
          </span>
          <button className="amx-btn amx-btn-outline" onClick={runTestUser} disabled={testRunning}>
            <Icon name="plus" size={16} />
            {testRunning ? "Generating…" : "Generate Test User"}
          </button>
          <Link to="/admin/settings/userBot" className="amx-btn amx-btn-outline amx-icon-action" title="User Bot settings">
            <Icon name="settings" size={16} />
          </Link>
        </div>
      </div>

      {status && (
        <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          <Kpi icon="users" color="#5E9A2C" value={status.totalBotUsers.toLocaleString()} label="Total Bot Users" />
          <Kpi icon="clock" color="#2C7A9C" value={status.generatedToday.toLocaleString()} label="Generated Today" />
          <Kpi icon="activity" color="#C24B3F" value={status.generatedThisHour.toLocaleString()} label="Generated This Hour" />
          <Kpi icon="layers" color="#C9942C" value={status.generatedThisMonth.toLocaleString()} label="Generated This Month" />
          <Kpi icon="eye" color="#5E9A2C" value={status.activeBotUsers.toLocaleString()} label="Active Bot Users" />
          <Kpi icon="globe" color="#8A6DC9" value={status.indiaBotUsers.toLocaleString()} label="India" />
          <Kpi icon="globe" color="#2C7A9C" value={status.internationalBotUsers.toLocaleString()} label="International" />
          <Kpi icon="target" color="#5E9A2C" value={status.schedulerStatus === "running" ? "Running" : "Stopped"} label="Scheduler Status" />
        </div>
      )}

      {status?.lastGenerated && (
        <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
          <div className="amx-panel-sub">
            Last generated: <strong>{status.lastGenerated.fullName}</strong> (@{status.lastGenerated.username}) — {status.lastGenerated.city}, {status.lastGenerated.country}, profile {status.lastGenerated.profileCompletion}% complete.
          </div>
        </div>
      )}
      {status?.lastError && (
        <div className="amx-card amx-panel" style={{ marginBottom: 20, borderColor: "var(--a-danger)" }}>
          <div className="amx-panel-sub" style={{ color: "var(--a-danger)" }}>
            <Icon name="info" size={14} /> Last error: {status.lastError.message}
          </div>
        </div>
      )}

      <div className="amx-card amx-panel">
        <div className="amx-panel-head">
          <div>
            <h3>Bot User Accounts</h3>
            <div className="amx-panel-sub">Every account here is permanently flagged userType:"bot" — never counted as a real user unless explicitly combined in Visitors/Users analytics.</div>
          </div>
        </div>

        {loading ? (
          <div className="amx-empty"><Icon name="users" /><strong>Loading…</strong></div>
        ) : rows.length === 0 ? (
          <div className="amx-empty">
            <Icon name="users" />
            <strong>No bot users yet</strong>
            <span>Enable the User Bot under Settings, or generate one now with "Generate Test User".</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="amx-row-clickable" onClick={() => navigate(`/admin/registered-users/${u.id}`)}>
                    <td>
                      <div>{u.fullName}</div>
                      <div className="amx-cell-sub">{u.email}</div>
                    </td>
                    <td>@{u.username}</td>
                    <td>{[u.locationCity, u.locationCountry].filter(Boolean).join(", ") || "—"}</td>
                    <td><StatusBadge status={u.status === "active" ? "ok" : "neutral"} label={u.status[0].toUpperCase() + u.status.slice(1)} /></td>
                    <td>{formatDateTime(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  );
}

export default SyntheticUsers;
