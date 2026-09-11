import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "login-history", label: "Login History" },
];

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ResetPasswordModal({ onClose, onSubmit, busy }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    onSubmit(password);
  };

  return (
    <div className="amx-modal-overlay" onClick={onClose}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Reset Password</h3>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {error && <div className="amx-alert-banner warn">{error}</div>}
          <div className="amx-form-group">
            <label htmlFor="reset-password">New Password</label>
            <input id="reset-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          <div className="amx-form-group">
            <label htmlFor="reset-confirm-password">Confirm Password</label>
            <input id="reset-confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
          </div>
          <button type="submit" className="amx-btn amx-btn-accent" disabled={busy}>{busy ? "Saving…" : "Reset Password"}</button>
        </form>
      </div>
    </div>
  );
}

function OverviewTab({ staff, overview }) {
  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Overview</h3></div>
      <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-value">{overview.totalLogins}</div>
          <div className="amx-kpi-label">Total Logins</div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-value" style={{ fontSize: 18 }}>{overview.lastLoginAt ? formatDateTime(overview.lastLoginAt) : "Never"}</div>
          <div className="amx-kpi-label">Last Login</div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-value" style={{ fontSize: 18 }}>{overview.firstLoginAt ? formatDateTime(overview.firstLoginAt) : "—"}</div>
          <div className="amx-kpi-label">First Login</div>
        </div>
      </div>

      <div className="amx-panel-head" style={{ marginTop: 24 }}><h3>Assigned Modules</h3></div>
      {Object.entries(staff.permissions || {}).filter(([, actions]) => actions.length > 0).length === 0 ? (
        <p className="amx-panel-sub">No modules assigned yet.</p>
      ) : (
        <div className="amx-permission-list">
          {Object.entries(staff.permissions || {})
            .filter(([, actions]) => actions.length > 0)
            .map(([key, actions]) => (
              <div className="amx-permission-row" key={key}>
                <span className="amx-permission-row-label">{key}</span>
                <span className="amx-panel-sub">{actions.join(", ")}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function LoginHistoryTab({ id }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    adminApi.get(`/staff/${id}/login-history`).then(({ data }) => setHistory(data.history)).catch(() => setHistory([]));
  }, [id]);

  const sessions = React.useMemo(() => {
    if (!history) return [];
    const logins = history.filter((h) => h.activityType === "login");
    const logoutBySession = new Map(history.filter((h) => h.activityType === "logout").map((h) => [h.sessionId, h]));
    return logins.map((login) => ({ login, logout: logoutBySession.get(login.sessionId) }));
  }, [history]);

  if (!history) return <p className="amx-panel-sub">Loading…</p>;
  if (sessions.length === 0) return <div className="amx-empty"><Icon name="inbox" /><strong>No login activity yet</strong></div>;

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Login History</h3></div>
      <div className="amx-table-wrap">
        <table className="amx-table">
          <thead>
            <tr>
              <th>Login</th>
              <th>Logout</th>
              <th>Duration</th>
              <th>IP Address</th>
              <th>Browser / OS</th>
              <th>Device</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(({ login, logout }) => (
              <tr key={login.id}>
                <td>{formatDateTime(login.createdAt)}</td>
                <td>{logout ? formatDateTime(logout.createdAt) : "—"}</td>
                <td>{formatDuration(login.sessionDurationSeconds)}</td>
                <td>{login.ipAddress || "—"}</td>
                <td>{[login.browser, login.os].filter(Boolean).join(" / ") || "—"}</td>
                <td style={{ textTransform: "capitalize" }}>{login.deviceType}</td>
                <td><StatusBadge status={login.status === "success" ? "active" : "failed"} label={login.status === "success" ? "Success" : login.failureReason || "Failed"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffDetail() {
  const { id, tab: tabParam } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [overview, setOverview] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : "overview";
  const goToTab = (key) => navigate(key === "overview" ? `/admin/staff/${id}` : `/admin/staff/${id}/${key}`, { replace: true });

  const load = () => {
    adminApi
      .get(`/staff/${id}`)
      .then(({ data }) => { setStaff(data.staff); setOverview(data.overview); })
      .catch(() => setStaff(null));
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const changeStatus = async (status) => {
    setStatusBusy(true);
    try {
      await adminApi.patch(`/staff/${id}/status`, { status });
      showToast(`Status updated to ${status}.`);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't update status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const resetPassword = async (password) => {
    setResetBusy(true);
    try {
      await adminApi.post(`/staff/${id}/reset-password`, { password });
      setResetOpen(false);
      showToast("Password reset successfully.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't reset password.");
    } finally {
      setResetBusy(false);
    }
  };

  if (!staff) return <div className="amx-empty"><Icon name="dots" /><strong>Loading…</strong></div>;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/staff")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Staff
          </button>
          <h1 style={{ marginTop: 10 }}>{staff.name}</h1>
          <p>{staff.email} · Last login {staff.lastLoginAt ? formatDateTime(staff.lastLoginAt) : "Never"}</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center", gap: 8 }}>
          <StatusBadge status={staff.status === "active" ? "active" : staff.status === "suspended" ? "suspended" : "inactive"} label={staff.status} />
          <Link to={`/admin/staff/${id}/edit`} className="amx-btn amx-btn-sm amx-btn-outline"><Icon name="edit" size={14} /> Edit</Link>
          <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={() => setResetOpen(true)}>Reset Password</button>
          {staff.status === "active" ? (
            <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" disabled={statusBusy} onClick={() => changeStatus("inactive")}>Deactivate</button>
          ) : (
            <button type="button" className="amx-btn amx-btn-sm amx-btn-accent" disabled={statusBusy} onClick={() => changeStatus("active")}>Activate</button>
          )}
          {staff.status !== "suspended" && (
            <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" style={{ color: "#C24B3F", borderColor: "#C24B3F" }} disabled={statusBusy} onClick={() => changeStatus("suspended")}>
              Suspend
            </button>
          )}
        </div>
      </div>

      <div className="amx-tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => goToTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab staff={staff} overview={overview} />}
      {tab === "login-history" && <LoginHistoryTab id={id} />}

      {resetOpen && <ResetPasswordModal onClose={() => setResetOpen(false)} onSubmit={resetPassword} busy={resetBusy} />}
      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default StaffDetail;
