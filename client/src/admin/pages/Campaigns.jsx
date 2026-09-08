import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

// Admin can raise a campaign for any masjid, not just an approved/Green
// Tick verified one — same full-rights override as adminMasjidController.js's
// own createMasjid. Lands on the new campaign's Basic Info tab to fill in
// the rest, mirroring the "Add Masjid" flow exactly.
function AddCampaignModal({ onCancel, onCreated }) {
  const [masjids, setMasjids] = useState(null);
  const [masjidId, setMasjidId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.get("/masjids", { params: { status: "all", pageSize: 500, sortBy: "name", sortDir: "asc" } })
      .then(({ data }) => setMasjids(data.masjids))
      .catch(() => setMasjids([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!masjidId) { setError("Select a masjid."); return; }
    if (!title.trim()) { setError("Campaign title is required."); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.post("/campaigns", { masjidId, title: title.trim() });
      onCreated(data.campaign);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create this campaign.");
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={() => (saving ? null : onCancel())}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close" disabled={saving}>
          <Icon name="x" size={16} />
        </button>
        <h3>Add Campaign</h3>
        <p className="amx-modal-sub">Creates a new campaign under the platform account. You'll land on its Basic Info tab next to fill in the rest.</p>
        <form onSubmit={submit}>
          <div className="amx-form-group">
            <label htmlFor="new-campaign-masjid">Masjid</label>
            <select id="new-campaign-masjid" value={masjidId} onChange={(e) => setMasjidId(e.target.value)} disabled={!masjids}>
              <option value="">{masjids ? "Select a masjid" : "Loading masjids…"}</option>
              {masjids?.map((m) => <option key={m.id} value={m.id}>{m.name}{m.city ? ` — ${m.city}` : ""}</option>)}
            </select>
          </div>
          <div className="amx-form-group">
            <label htmlFor="new-campaign-title">Campaign Title</label>
            <input id="new-campaign-title" type="text" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rebuild Our Flood-Damaged Prayer Hall" maxLength={255} />
          </div>
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="amx-btn amx-btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const navigate = useNavigate();
  const [addingCampaign, setAddingCampaign] = useState(false);
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
        <button type="button" className="amx-btn amx-btn-primary" onClick={() => setAddingCampaign(true)}>
          <Icon name="plus" size={15} /> Add Campaign
        </button>
      </div>

      {addingCampaign && (
        <AddCampaignModal
          onCancel={() => setAddingCampaign(false)}
          onCreated={(campaign) => navigate(`/admin/campaigns/${campaign.id}/basic`)}
        />
      )}

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
