import React, { useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { CONTENT_ITEMS } from "../mockData.js";

function ContentManagement() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  const types = ["all", ...Array.from(new Set(CONTENT_ITEMS.map((c) => c.type)))];

  const filtered = useMemo(() => {
    return CONTENT_ITEMS.filter((c) => {
      const matchesQuery = !query.trim() || c.title.toLowerCase().includes(query.toLowerCase());
      const matchesType = type === "all" || c.type === type;
      return matchesQuery && matchesType;
    });
  }, [query, type]);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>Content Management</h1>
          <p>Manage website pages, campaign stories, and announcements</p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-accent">
            <Icon name="plus" size={16} />
            New Content
          </button>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search content…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="amx-select" value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All types" : t}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="amx-empty">
            <Icon name="content" />
            <strong>No content matches your filters</strong>
            <span>Try a different search term or content type.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Author</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="amx-cell-main">
                        <span className="amx-avatar" style={{ width: 30, height: 30, background: "var(--a-bg)", color: "var(--a-navy-soft)" }}>
                          <Icon name="fileText" size={14} />
                        </span>
                        {c.title}
                      </div>
                    </td>
                    <td className="amx-cell-sub">{c.type}</td>
                    <td>{c.author}</td>
                    <td>{c.updated}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <div className="amx-row-actions">
                        <button className="amx-icon-action" aria-label="Edit" style={{ color: "var(--a-navy-soft)" }}>
                          <Icon name="edit" />
                        </button>
                      </div>
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

export default ContentManagement;
