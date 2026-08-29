import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import SortHeader from "../components/SortHeader.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate, formatDateTime } from "../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const METHOD_LABEL = {
  email: "Email",
  mobile: "Mobile",
  both: "Email + Mobile",
};

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

const SORT_COLUMNS = {
  name: { label: "User", get: (u) => u.fullName?.toLowerCase() || "" },
  contact: { label: "Contact", get: (u) => (u.email || u.mobile || "").toLowerCase() },
  method: { label: "Method", get: (u) => (METHOD_LABEL[u.registrationMethod] || u.registrationMethod || "").toLowerCase() },
  verification: { label: "Verification", get: (u) => (u.emailVerified || u.mobileVerified ? 1 : 0) },
  status: { label: "Status", get: (u) => u.status || "" },
  createdAt: { label: "Registered", get: (u) => new Date(u.createdAt).getTime() },
  lastLoginAt: { label: "Last Login", get: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : -1) },
};


function RegisteredUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const loadUsers = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/users")
      .then(({ data }) => setUsers(data.users))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load registered users."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.mobile || "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || u.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [users, query, status]);

  const sorted = useMemo(() => {
    const getValue = SORT_COLUMNS[sortKey].get;
    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  useEffect(() => setPage(1), [query, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => {
    const c = { active: 0, pending_verification: 0, suspended: 0, inactive: 0 };
    users.forEach((u) => {
      c[u.status] = (c[u.status] || 0) + 1;
    });
    return c;
  }, [users]);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Community</span>
          <h1>Registered Users</h1>
          <p>Everyone who has created a public account on Masjid My Community</p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-outline" onClick={loadUsers}>
            <Icon name="activity" size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#5E9A2C1a", color: "#5E9A2C" }}>
              <Icon name="donors" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">{users.length}</div>
            <div className="amx-kpi-label">Total Registered</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#5E9A2C1a", color: "#5E9A2C" }}>
              <Icon name="verify" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">{counts.active || 0}</div>
            <div className="amx-kpi-label">Active Accounts</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#C9A2271a", color: "#C9A227" }}>
              <Icon name="clock" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">{counts.pending_verification || 0}</div>
            <div className="amx-kpi-label">Pending Verification</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#C24B3F1a", color: "#C24B3F" }}>
              <Icon name="shield" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">{counts.suspended || 0}</div>
            <div className="amx-kpi-label">Suspended</div>
          </div>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search by name, username, email or mobile…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="amx-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {error && (
          <div className="amx-form-error" style={{ margin: "0 24px 16px" }}>
            <Icon name="info" size={17} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="amx-empty">
            <Icon name="donors" />
            <strong>Loading registered users…</strong>
          </div>
        ) : filtered.length === 0 ? (
          <div className="amx-empty">
            <Icon name="donors" />
            <strong>No users match your filters</strong>
            <span>Try a different search term or status filter.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <SortHeader label="User" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Contact" sortKey="contact" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Method" sortKey="method" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Verification" sortKey="verification" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Registered" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <SortHeader label="Last Login" sortKey="lastLoginAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="amx-cell-main">
                        <span className="amx-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {initialsOf(u.fullName)}
                        </span>
                        <div>
                          <div>{u.fullName}</div>
                          <div className="amx-cell-sub">@{u.username} · #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{u.email || "—"}</div>
                      <div className="amx-cell-sub">{u.mobile || "—"}</div>
                    </td>
                    <td>{METHOD_LABEL[u.registrationMethod] || u.registrationMethod}</td>
                    <td>
                      {u.emailVerified || u.mobileVerified ? (
                        <StatusBadge status="verified" />
                      ) : (
                        <StatusBadge status="pending" />
                      )}
                    </td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <button className="amx-link-btn" onClick={() => navigate(`/admin/registered-users/${u.id}/activity`)}>
                        {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}
                      </button>
                    </td>
                    <td>
                      <div className="amx-row-actions">
                        <button className="amx-icon-action" aria-label="View details" onClick={() => navigate(`/admin/registered-users/${u.id}`)}>
                          <Icon name="eye" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  );
}

export default RegisteredUsers;
