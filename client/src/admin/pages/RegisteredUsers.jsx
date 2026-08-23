import React, { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";

const PAGE_SIZE = 8;

const METHOD_LABEL = {
  email: "Email",
  mobile: "Mobile",
  both: "Email + Mobile",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function UserDetailsModal({ user, onClose, onChangeStatus, actionLoading }) {
  return (
    <div className="amx-modal-overlay" onClick={onClose}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <button className="amx-modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <span className="amx-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
            {initialsOf(user.fullName)}
          </span>
          <div>
            <h3 style={{ margin: 0 }}>{user.fullName}</h3>
            <p className="amx-modal-sub" style={{ margin: "2px 0 0" }}>
              @{user.username}
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div>
            <div className="amx-cell-sub">User ID</div>
            <div>#{user.id}</div>
          </div>
          <div>
            <div className="amx-cell-sub">Registration Method</div>
            <div>{METHOD_LABEL[user.registrationMethod] || user.registrationMethod}</div>
          </div>
          <div>
            <div className="amx-cell-sub">Email Address</div>
            <div>{user.email || "—"}</div>
          </div>
          <div>
            <div className="amx-cell-sub">Mobile Number</div>
            <div>{user.mobile || "—"}</div>
          </div>
          <div>
            <div className="amx-cell-sub">Email Verified</div>
            <div>{user.emailVerified ? "Yes" : "No"}</div>
          </div>
          <div>
            <div className="amx-cell-sub">Mobile Verified</div>
            <div>{user.mobileVerified ? "Yes" : "No"}</div>
          </div>
          <div>
            <div className="amx-cell-sub">Registered On</div>
            <div>{formatDate(user.createdAt)}</div>
          </div>
          <div>
            <div className="amx-cell-sub">Last Login</div>
            <div>{formatDateTime(user.lastLoginAt)}</div>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div className="amx-cell-sub" style={{ marginBottom: 8 }}>
            Account Status
          </div>
          <StatusBadge status={user.status} />
        </div>

        {user.status !== "pending_verification" && (
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            {user.status !== "active" && (
              <button className="amx-btn amx-btn-accent" style={{ flex: 1 }} disabled={actionLoading} onClick={() => onChangeStatus(user.id, "active")}>
                Activate
              </button>
            )}
            {user.status !== "inactive" && (
              <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} disabled={actionLoading} onClick={() => onChangeStatus(user.id, "inactive")}>
                Deactivate
              </button>
            )}
            {user.status !== "suspended" && (
              <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} disabled={actionLoading} onClick={() => onChangeStatus(user.id, "suspended")}>
                Suspend
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RegisteredUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => setPage(1), [query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => {
    const c = { active: 0, pending_verification: 0, suspended: 0, inactive: 0 };
    users.forEach((u) => {
      c[u.status] = (c[u.status] || 0) + 1;
    });
    return c;
  }, [users]);

  const changeStatus = async (id, nextStatus) => {
    setActionLoading(true);
    try {
      const { data } = await adminApi.put(`/users/${id}/status`, { status: nextStatus });
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
      setSelectedUser(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update this account.");
    } finally {
      setActionLoading(false);
    }
  };

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
            <option value="pending_verification">Pending Verification</option>
            <option value="inactive">Inactive</option>
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
                  <th>User</th>
                  <th>Contact</th>
                  <th>Method</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Last Login</th>
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
                    <td>{formatDateTime(u.lastLoginAt)}</td>
                    <td>
                      <div className="amx-row-actions">
                        <button className="amx-icon-action" aria-label="View details" onClick={() => setSelectedUser(u)}>
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

        <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onChangeStatus={changeStatus}
          actionLoading={actionLoading}
        />
      )}
    </>
  );
}

export default RegisteredUsers;
