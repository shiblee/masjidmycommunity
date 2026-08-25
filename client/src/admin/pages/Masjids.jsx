import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";

const TABS = [
  { key: "all", label: "All Masjids" },
  { key: "submitted", label: "Pending Verification" },
  { key: "under_review", label: "Under Review" },
  { key: "changes_requested", label: "Changes Requested" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "inactive", label: "Inactive" },
];

function Masjids() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ masjids: [], total: 0, pageSize: 20, counts: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/masjids", { params: { status: tab, q: q || undefined, page } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, q, page]);

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
                <th>Masjid</th>
                <th>Location</th>
                <th>Registered</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.masjids.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="amx-verify-thumb" style={{ width: 36, height: 36 }}>
                        {m.coverPhotoUrl ? <img src={`http://localhost:5050${m.coverPhotoUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <Icon name="mosque" size={16} />}
                      </div>
                      <strong>{m.name}</strong>
                    </div>
                  </td>
                  <td>{[m.city, m.country].filter(Boolean).join(", ") || "—"}</td>
                  <td>{new Date(m.createdAt).toLocaleDateString()}</td>
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
