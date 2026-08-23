import React, { useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { USERS } from "../mockData.js";

function Users() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => USERS.filter((u) => !query.trim() || u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>Users</h1>
          <p>Manage admin team members, roles, and access</p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-accent">
            <Icon name="plus" size={16} />
            Invite User
          </button>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Last Active</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="amx-cell-main">
                      <span className="amx-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {u.initials}
                      </span>
                      <div>
                        <div>{u.name}</div>
                        <div className="amx-cell-sub">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.role}</td>
                  <td>{u.last}</td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" style={{ color: "var(--a-navy-soft)" }}>
                        <Icon name="edit" />
                      </button>
                      <button className="amx-icon-action reject" aria-label="Remove">
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Users;
