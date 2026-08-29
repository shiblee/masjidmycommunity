import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import SortHeader from "../components/SortHeader.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

const TABS = [
  { key: "all", label: "All Masjids" },
  { key: "submitted", label: "Pending Verification" },
  { key: "under_review", label: "Under Review" },
  { key: "changes_requested", label: "Changes Requested" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "inactive", label: "Inactive" },
  { key: "deleted", label: "Deleted" },
];

function Masjids() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [data, setData] = useState({ masjids: [], total: 0, pageSize: 20, counts: {} });
  const [loading, setLoading] = useState(true);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/masjids", { params: { status: tab, q: q || undefined, page, pageSize: 100, sortBy, sortDir } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, q, page, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Trust &amp; Safety</span>
          <h1>Masjid Management</h1>
          <p>Review and manage masjid registrations submitted by users</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => { setTab(t.key); setPage(1); }}>
              {t.label}{t.key !== "all" && data.counts?.[t.key] !== undefined ? ` (${data.counts[t.key]})` : ""}
            </button>
          ))}
        </div>

        <div className="amx-topbar-search" style={{ maxWidth: 360, marginBottom: 20 }}>
          <Icon name="search" />
          <input type="text" placeholder="Search masjids, cities, countries…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>

        {!loading && data.masjids.length === 0 && (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>No masjids here</strong>
            <span>Nothing matches this filter right now.</span>
          </div>
        )}

        {data.masjids.length > 0 && (
          <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Masjid" sortKey="name" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Registered By" sortKey="ownerName" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Location" sortKey="location" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Registered" sortKey="createdAt" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortBy} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.masjids.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="amx-verify-thumb" style={{ width: 36, height: 36 }}>
                        {m.coverPhotoUrl ? <img src={`${API_ORIGIN}${m.coverPhotoUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <Icon name="mosque" size={16} />}
                      </div>
                      <strong>{m.name}</strong>
                    </div>
                  </td>
                  <td>
                    <div>{m.ownerName || "—"}</div>
                    <div className="amx-cell-sub">{m.ownerEmail || m.ownerMobile || "—"}</div>
                  </td>
                  <td>{[m.city, m.country].filter(Boolean).join(", ") || "—"}</td>
                  <td>{formatDate(m.createdAt)}</td>
                  <td><StatusBadge status={m.status} /></td>
                  <td style={{ textAlign: "right" }}>
                    <Link to={`/admin/masjids/${m.id}`} className="amx-btn amx-btn-sm amx-btn-outline">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={data.total} pageSize={data.pageSize} onChange={setPage} />
      </div>
    </>
  );
}

export default Masjids;
