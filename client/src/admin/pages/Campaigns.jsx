import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

const TABS = [
  { key: "all", label: "All Campaigns" },
  { key: "submitted", label: "Pending Review" },
  { key: "under_review", label: "Under Review" },
  { key: "changes_requested", label: "Changes Requested" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "goal_reached", label: "Goal Reached" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function Campaigns() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ campaigns: [], total: 0, pageSize: 20, counts: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/campaigns", { params: { status: tab, q: q || undefined, page } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, q, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const totalActive = (data.counts?.active || 0) + (data.counts?.goal_reached || 0);
  const totalRaised = data.campaigns.reduce((s, c) => s + Number(c.amountRaised || 0), 0);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Fundraising</span>
          <h1>Campaigns</h1>
          <p>{totalActive} active campaigns on this page · {currency(totalRaised)} raised across this page</p>
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
          <input type="text" placeholder="Search campaign titles…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>

        {!loading && data.campaigns.length === 0 && (
          <div className="amx-empty">
            <Icon name="campaign" />
            <strong>No campaigns here</strong>
            <span>Nothing matches this filter right now.</span>
          </div>
        )}

        {data.campaigns.length > 0 && (
          <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Masjid</th>
                <th>Goal</th>
                <th>Raised</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => {
                const pct = c.progressPercent ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="amx-verify-thumb" style={{ width: 36, height: 36 }}>
                          {c.coverPhotoUrl ? <img src={`${API_ORIGIN}${c.coverPhotoUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <Icon name="campaign" size={16} />}
                        </div>
                        <div>
                          <strong>{c.title}</strong>
                          <div className="amx-cell-sub">ID {c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.masjid?.name || "—"}</td>
                    <td>{c.goalAmount ? currency(c.goalAmount) : <span className="amx-cell-sub">No goal set</span>}</td>
                    <td>{currency(c.amountRaised)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="amx-progress" style={{ width: 70 }}>
                          <span style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="amx-cell-sub">{pct}%</span>
                      </div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/admin/campaigns/${c.id}`} className="amx-btn amx-btn-sm amx-btn-outline">Review</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={data.total} pageSize={data.pageSize} onChange={setPage} />
      </div>
    </>
  );
}

export default Campaigns;
