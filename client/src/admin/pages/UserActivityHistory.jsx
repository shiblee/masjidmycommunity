import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import SortHeader from "../components/SortHeader.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const DEVICE_LABEL = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet", unknown: "Unknown" };

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0 && m === 0) return "< 1m";
  return [h ? `${h}h` : null, `${m}m`].filter(Boolean).join(" ");
}

function UserActivityHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [type, setType] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [ip, setIp] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    adminApi
      .get(`/users/${id}/activity`, {
        params: {
          type,
          sortBy,
          sort: sortDir === "asc" ? "oldest" : "newest",
          ip: ip.trim() || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          page,
        },
      })
      .then(({ data }) => {
        setUser(data.user);
        setActivities(data.activities);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load activity history."))
      .finally(() => setLoading(false));
  }, [id, type, sortBy, sortDir, ip, dateFrom, dateTo, page]);

  useEffect(() => setPage(1), [type, sortBy, sortDir, ip, dateFrom, dateTo]);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate(`/admin/registered-users/${id}`)}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to User
          </button>
          <h1 style={{ marginTop: 10 }}>{user ? `${user.fullName}'s Activity History` : "Login & Activity History"}</h1>
          <p>Complete login and logout history for this account</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search by IP address…" value={ip} onChange={(e) => setIp(e.target.value)} />
          </div>
          <select className="amx-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All activity</option>
            <option value="login">Login only</option>
            <option value="logout">Logout only</option>
          </select>
          <input type="date" className="amx-select" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
          <input type="date" className="amx-select" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
        </div>

        {error && (
          <div className="amx-form-error" style={{ margin: "0 24px 16px" }}>
            <Icon name="info" size={17} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="amx-empty"><Icon name="clock" /><strong>Loading activity…</strong></div>
        ) : activities.length === 0 ? (
          <div className="amx-empty">
            <Icon name="clock" />
            <strong>No activity recorded</strong>
            <span>No login or logout events match these filters.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <SortHeader label="Date & Time" sortKey="createdAt" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Activity" sortKey="activityType" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="IP Address" sortKey="ipAddress" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Device" sortKey="deviceType" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Browser" sortKey="browser" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="OS" sortKey="os" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Location" sortKey="location" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Session Duration" sortKey="sessionDurationSeconds" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDateTime(a.createdAt)}</td>
                    <td>
                      <StatusBadge status={a.status === "failure" ? "failed" : a.activityType === "login" ? "verified" : "neutral"} label={`${a.activityType === "login" ? "Login" : "Logout"}${a.status === "failure" ? " (Failed)" : ""}`} />
                    </td>
                    <td>{a.ipAddress || "—"}</td>
                    <td>{DEVICE_LABEL[a.deviceType]}</td>
                    <td>{a.browser || "—"}</td>
                    <td>{a.os || "—"}</td>
                    <td>{a.location || "—"}</td>
                    <td>{formatDuration(a.sessionDurationSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={10} onChange={setPage} />
      </div>
    </>
  );
}

export default UserActivityHistory;
