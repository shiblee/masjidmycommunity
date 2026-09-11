import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "suspended", label: "Suspended" },
];

function StaffList() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = () => {
    adminApi
      .get("/staff", { params: { status: statusFilter === "all" ? undefined : statusFilter, q: q || undefined } })
      .then(({ data }) => setStaff(data.staff))
      .catch(() => setStaff([]));
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Staff Management</span>
          <h1>Staff</h1>
          <p>Employee accounts, module permissions, and login activity.</p>
        </div>
        <div className="amx-page-actions">
          <Link to="/admin/staff/new" className="amx-btn amx-btn-accent">
            <Icon name="plus" size={16} /> Add Staff
          </Link>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          {STATUS_TABS.map((t) => (
            <button key={t.key} type="button" className={statusFilter === t.key ? "active" : ""} onClick={() => setStatusFilter(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            style={{ flex: 1, maxWidth: 320 }}
          />
          <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={load}>
            <Icon name="search" size={14} /> Search
          </button>
        </div>

        {staff && staff.length === 0 && (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>No staff accounts yet</strong>
            <span>Add a staff member to give them access to the admin panel.</span>
          </div>
        )}

        {staff && staff.length > 0 && (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Email</th>
                  <th>Assigned Modules</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Login Count</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/staff/${s.id}`)}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.email}</td>
                    <td>{s.assignedModules.length ? s.assignedModules.join(", ") : "—"}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>{s.lastLoginAt ? formatDateTime(s.lastLoginAt) : "Never"}</td>
                    <td>{s.loginCount}</td>
                    <td>{formatDateTime(s.createdAt)}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <Link to={`/admin/staff/${s.id}`} className="amx-btn amx-btn-sm amx-btn-outline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default StaffList;
