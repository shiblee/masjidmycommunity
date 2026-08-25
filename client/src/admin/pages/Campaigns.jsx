import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";

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
          <div className="amx-campaign-grid">
            {data.campaigns.map((c) => {
              const pct = c.progressPercent ?? 0;
              return (
                <Link to={`/admin/campaigns/${c.id}`} className="amx-campaign-card" key={c.id} style={{ display: "block", color: "inherit" }}>
                  <div className="amx-campaign-cover" style={{ background: c.coverPhotoUrl ? `url(http://localhost:5050${c.coverPhotoUrl}) center/cover` : "linear-gradient(135deg,#1E3A46,#2A4E5C)" }}>
                    {!c.coverPhotoUrl && <Icon name="campaign" />}
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="amx-campaign-body">
                    <div>
                      <h4>{c.title}</h4>
                      <div className="amx-campaign-masjid">{c.masjid?.name}</div>
                    </div>
                    <div>
                      <div className="amx-progress">
                        <span style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="amx-campaign-stats" style={{ marginTop: 7 }}>
                        <span>{currency(c.amountRaised)} raised</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    <div className="amx-campaign-foot">
                      <span>
                        <Icon name="target" />
                        {c.goalAmount ? currency(c.goalAmount) : "No goal set"}
                      </span>
                      <span>
                        <Icon name="clock" />
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={data.total} pageSize={data.pageSize} onChange={setPage} />
      </div>
    </>
  );
}

export default Campaigns;
