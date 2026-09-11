import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import PermissionMatrix from "../components/PermissionMatrix.jsx";
import ActivityBarChart from "../components/ActivityBarChart.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "permissions", label: "Permissions" },
  { key: "login-history", label: "Login History" },
  { key: "activity", label: "Activity" },
  { key: "usage-analytics", label: "Usage Analytics" },
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

function OverviewTab({ overview }) {
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
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-value">{overview.totalActivity}</div>
          <div className="amx-kpi-label">Total Activity</div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-value" style={{ fontSize: 18 }}>{overview.mostUsedModule || "—"}</div>
          <div className="amx-kpi-label">Most Used Module</div>
        </div>
      </div>

      {overview.moduleUsage?.length > 0 && (
        <>
          <div className="amx-panel-head" style={{ marginTop: 24 }}><h3>Module Usage</h3></div>
          <div className="amx-permission-list">
            {overview.moduleUsage.map((m) => (
              <div className="amx-permission-row" key={m.module}>
                <span className="amx-permission-row-label">{m.module}</span>
                <span className="amx-panel-sub">{m.count} action{m.count === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PermissionsTab({ id, staff, onSaved }) {
  const [modules, setModules] = useState([]);
  const [modulesStatus, setModulesStatus] = useState("loading"); // "loading" | "loaded" | "error"
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(staff.permissions || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(null);

  const loadModules = () => {
    setModulesStatus("loading");
    adminApi
      .get("/staff/permission-modules")
      .then(({ data }) => {
        setModules(data.modules || []);
        setModulesStatus("loaded");
      })
      .catch(() => setModulesStatus("error"));
  };

  useEffect(() => { loadModules(); }, []);

  useEffect(() => {
    adminApi.get(`/staff/${id}/permission-history`).then(({ data }) => setHistory(data.history)).catch(() => setHistory([]));
  }, [id, staff.permissions]);

  const startEdit = () => {
    setDraft(staff.permissions || {});
    setError("");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await adminApi.patch(`/staff/${id}`, { permissions: draft });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const granted = Object.entries(staff.permissions || {}).filter(([, actions]) => actions.length > 0);

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Permissions</h3>
        {!editing && (
          <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={startEdit}>
            <Icon name="edit" size={14} /> Edit Permissions
          </button>
        )}
      </div>

      {editing ? (
        <>
          {error && <div className="amx-alert-banner warn" style={{ marginBottom: 16 }}>{error}</div>}
          {modulesStatus === "loading" && <p className="amx-panel-sub">Loading modules…</p>}
          {modulesStatus === "error" && (
            <div className="amx-alert-banner warn" style={{ alignItems: "center" }}>
              <span style={{ flex: 1 }}>Couldn't load the list of modules to assign.</span>
              <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={loadModules}>Retry</button>
            </div>
          )}
          {modulesStatus === "loaded" && <PermissionMatrix modules={modules} permissions={draft} onChange={setDraft} />}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" className="amx-btn amx-btn-outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="amx-btn amx-btn-accent" disabled={saving || modulesStatus !== "loaded"} onClick={save}>{saving ? "Saving…" : "Save Changes"}</button>
          </div>
        </>
      ) : granted.length === 0 ? (
        <p className="amx-panel-sub">No modules assigned yet.</p>
      ) : (
        <div className="amx-permission-list">
          {granted.map(([key, actions]) => {
            const label = modules.find((m) => m.key === key)?.label || key;
            return (
              <div className="amx-permission-row" key={key}>
                <span className="amx-permission-row-label">{label}</span>
                <span className="amx-panel-sub">{actions.join(", ")}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="amx-panel-head" style={{ marginTop: 24 }}><h3>Permission Change History</h3></div>
      {!history ? (
        <p className="amx-panel-sub">Loading…</p>
      ) : history.length === 0 ? (
        <p className="amx-panel-sub">No permission changes recorded yet.</p>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Changed By</th>
                <th>Before</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{formatDateTime(h.createdAt)}</td>
                  <td>{h.changedByAdminName || "—"}</td>
                  <td>{Object.entries(h.oldPermissions || {}).filter(([, a]) => a.length > 0).map(([k, a]) => `${k}: ${a.join(",")}`).join("; ") || "None"}</td>
                  <td>{Object.entries(h.newPermissions || {}).filter(([, a]) => a.length > 0).map(([k, a]) => `${k}: ${a.join(",")}`).join("; ") || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ACTIVITY_TYPE_LABEL = { action: "Action", page_view: "Page View" };

function ActivityTab({ id }) {
  const [activity, setActivity] = useState(null);
  const [filters, setFilters] = useState({ module: "", dateFrom: "", dateTo: "" });

  const load = () => {
    const params = {};
    if (filters.module) params.module = filters.module;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    adminApi.get(`/staff/${id}/activity`, { params }).then(({ data }) => setActivity(data.activity)).catch(() => setActivity([]));
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Activity</h3></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input type="text" placeholder="Module (e.g. masjid)" value={filters.module} onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))} style={{ maxWidth: 180 }} />
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
        <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={load}><Icon name="search" size={14} /> Filter</button>
      </div>

      {!activity ? (
        <p className="amx-panel-sub">Loading…</p>
      ) : activity.length === 0 ? (
        <div className="amx-empty"><Icon name="inbox" /><strong>No activity recorded yet</strong><span>Actions on Masjids and Staff show up here as they happen.</span></div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Module</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.createdAt)}</td>
                  <td>{ACTIVITY_TYPE_LABEL[a.activityType] || a.activityType}</td>
                  <td style={{ textTransform: "capitalize" }}>{a.module || "—"}</td>
                  <td style={{ textTransform: "capitalize" }}>{a.action || "—"}</td>
                  <td>{a.targetId ? `#${a.targetId}` : a.summary || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UsageAnalyticsTab({ id }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi.get(`/staff/${id}/usage-analytics`).then(({ data }) => setData(data)).catch(() => setData(false));
  }, [id]);

  if (data === null) return <p className="amx-panel-sub">Loading…</p>;
  if (data === false) return <div className="amx-empty"><Icon name="inbox" /><strong>Couldn't load usage analytics</strong></div>;

  const maxModuleCount = Math.max(...data.moduleUsage.map((m) => m.count), 1);

  return (
    <>
      <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
        <div className="amx-panel-head"><h3>Daily Activity (last 30 days)</h3></div>
        <ActivityBarChart data={data.dailyActivity} />
        <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 20 }}>
          <div className="amx-card amx-kpi">
            <div className="amx-kpi-value">{data.totalActivity30d}</div>
            <div className="amx-kpi-label">Total (30d)</div>
          </div>
          <div className="amx-card amx-kpi">
            <div className="amx-kpi-value">{data.avgDaily}</div>
            <div className="amx-kpi-label">Avg / Day</div>
          </div>
          <div className="amx-card amx-kpi">
            <div className="amx-kpi-value">{data.peakHour != null ? `${data.peakHour}:00` : "—"}</div>
            <div className="amx-kpi-label">Peak Hour</div>
          </div>
          <div className="amx-card amx-kpi">
            <div className="amx-kpi-value">{data.loginDaysThisMonth}</div>
            <div className="amx-kpi-label">Login Days (Month)</div>
          </div>
        </div>
        {data.isSpike && (
          <div className="amx-alert-banner warn" style={{ marginTop: 16 }}>
            Today's activity ({data.todayCount}) is notably higher than the recent daily average ({data.avgDaily}).
          </div>
        )}
      </div>

      <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
        <div className="amx-panel-head"><h3>Module Usage (last 30 days)</h3></div>
        {data.moduleUsage.length === 0 ? (
          <p className="amx-panel-sub">No module usage recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.moduleUsage.map((m) => (
              <div key={m.module} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ minWidth: 140, fontSize: 13.5, fontWeight: 600, color: "var(--a-text)" }}>{m.module}</span>
                <div style={{ flex: 1, height: 8, background: "rgba(30,58,70,.08)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(m.count / maxModuleCount) * 100}%`, height: "100%", background: "var(--a-green-deep)", borderRadius: 4 }} />
                </div>
                <span className="amx-panel-sub" style={{ minWidth: 60, textAlign: "right" }}>{m.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-panel-head"><h3>AI Insights</h3></div>
        {data.aiConfigured ? (
          data.aiSummary ? (
            <p>{data.aiSummary}</p>
          ) : (
            <p className="amx-panel-sub">Not enough activity yet to generate a summary.</p>
          )
        ) : (
          <p className="amx-panel-sub">AI-generated insights aren't available yet — this requires an AI provider API key to be configured on the server.</p>
        )}
      </div>
    </>
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

      {tab === "overview" && <OverviewTab overview={overview} />}
      {tab === "permissions" && <PermissionsTab id={id} staff={staff} onSaved={load} />}
      {tab === "login-history" && <LoginHistoryTab id={id} />}
      {tab === "activity" && <ActivityTab id={id} />}
      {tab === "usage-analytics" && <UsageAnalyticsTab id={id} />}

      {resetOpen && <ResetPasswordModal onClose={() => setResetOpen(false)} onSubmit={resetPassword} busy={resetBusy} />}
      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default StaffDetail;
