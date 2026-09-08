import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Pagination from "../../components/Pagination.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDateTime } from "../../../utils/formatDateTime.js";
import VisitorInsights from "./components/VisitorInsights.jsx";
import OnlineNowWidget from "./components/OnlineNowWidget.jsx";

const PAGE_SIZE = 50;

function formatDuration(seconds) {
  const s = Number(seconds) || 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const STATUS_MAP = { active: "ok", idle: "warn", ended: "neutral" };

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

function Visitors() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [query, setQuery] = useState("");
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [device, setDevice] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("visitTime");
  const [sortDir, setSortDir] = useState("desc");

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filterParams = () => ({
    q: query.trim() || undefined,
    from: `${from}T00:00:00.000Z`,
    to: `${to}T23:59:59.999Z`,
    type,
    status,
    device,
    sort: sortKey,
    dir: sortDir,
  });

  const loadSummary = () => {
    const params = { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` };
    adminApi.get("/visitors/summary", { params }).then(({ data }) => setSummary(data)).catch(() => {});
    adminApi.get("/visitors/insights", { params }).then(({ data }) => setInsights(data.insights)).catch(() => setInsights([]));
  };

  const loadSessions = () => {
    setLoading(true);
    adminApi
      .get("/visitors/sessions", { params: { ...filterParams(), page, pageSize: PAGE_SIZE } })
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

  useEffect(loadSummary, [from, to]);
  useEffect(loadSessions, [query, from, to, type, status, device, sortKey, sortDir, page]);
  useEffect(() => setPage(1), [query, from, to, type, status, device]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data } = await adminApi.get("/visitors/sessions", { params: { ...filterParams(), export: "csv" }, responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visitor-sessions-${todayIso()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // no export utility exists elsewhere in this app to fall back to a
      // shared error toast — a silently-failed download is the safe default
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Users</span>
          <h1>Visitors</h1>
          <p>Real-time site traffic and visitor analytics for the public website</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center", gap: 10 }}>
          <OnlineNowWidget />
          <button className="amx-btn amx-btn-outline" onClick={exportCsv} disabled={exporting}>
            <Icon name="download" size={16} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {summary && (
        <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          <Kpi icon="eye" color="#5E9A2C" value={summary.totalVisitors.toLocaleString()} label="Total Visitors" />
          <Kpi icon="clock" color="#2C7A9C" value={summary.todaysVisitors.toLocaleString()} label="Today's Visitors" />
          <Kpi icon="activity" color="#C24B3F" value={summary.activeVisitors.toLocaleString()} label="Active Visitors" />
          <Kpi icon="plus" color="#5E9A2C" value={summary.newVisitors.toLocaleString()} label="New Visitors" />
          <Kpi icon="users" color="#8A6DC9" value={summary.returningVisitors.toLocaleString()} label="Returning Visitors" />
          <Kpi icon="layers" color="#C9942C" value={summary.sessions.toLocaleString()} label="Sessions" />
          <Kpi icon="target" color="#2C7A9C" value={formatDuration(summary.avgSessionDurationSeconds)} label="Avg Session Duration" />
        </div>
      )}

      <VisitorInsights insights={insights} />

      <div className="amx-card amx-panel">
        <div className="amx-filters" style={{ flexWrap: "wrap" }}>
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search by session, page, or referrer…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <input className="amx-select" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <input className="amx-select" type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} />
          <select className="amx-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">New &amp; Returning</option>
            <option value="new">New</option>
            <option value="returning">Returning</option>
          </select>
          <select className="amx-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="ended">Ended</option>
          </select>
          <select className="amx-select" value={device} onChange={(e) => setDevice(e.target.value)}>
            <option value="all">All Devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </div>

        {loading ? (
          <div className="amx-empty">
            <Icon name="eye" />
            <strong>Loading visitors…</strong>
          </div>
        ) : rows.length === 0 ? (
          <div className="amx-empty">
            <Icon name="eye" />
            <strong>No visitors match your filters</strong>
            <span>Try a wider date range or different filters.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <SortHeader label="Visit Time" sortKey="visitTime" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Type" sortKey="type" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Device" sortKey="device" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Browser" sortKey="browser" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Location" sortKey="location" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Pages" sortKey="pages" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Duration" sortKey="duration" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="amx-row-clickable" onClick={() => navigate(`/admin/visitors/${s.sessionKey}`)}>
                    <td>
                      <div>Visitor #{s.visitorId}</div>
                      <div className="amx-cell-sub">{s.landingPath}</div>
                    </td>
                    <td>{formatDateTime(s.startedAt)}</td>
                    <td><StatusBadge status={s.visitorType === "new" ? "ok" : "neutral"} label={s.visitorType === "new" ? "New" : "Returning"} /></td>
                    <td style={{ textTransform: "capitalize" }}>{s.deviceType || "—"}</td>
                    <td>{s.browser || "—"}</td>
                    <td>{s.country || "—"}</td>
                    <td>{s.pageCount}</td>
                    <td>{formatDuration(s.durationSeconds)}</td>
                    <td><StatusBadge status={STATUS_MAP[s.status] || "neutral"} label={s.status[0].toUpperCase() + s.status.slice(1)} /></td>
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

export default Visitors;
