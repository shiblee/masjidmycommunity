import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import campaignApi from "../../services/campaignApi.js";
import masjidApi from "../../services/masjidApi.js";
import MediaThumb from "../../components/MediaThumb.jsx";

const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review", changes_requested: "Changes Requested",
  approved: "Approved", active: "Active", paused: "Paused", goal_reached: "Goal Reached",
  completed: "Completed", rejected: "Rejected", cancelled: "Cancelled",
};
const EDITABLE = new Set(["draft", "changes_requested"]);
const LIVE = new Set(["active", "paused", "goal_reached", "completed"]);

function MyCampaigns() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMasjidId = searchParams.get("masjidId") || "";
  const [masjids, setMasjids] = useState(null);
  const [masjidId, setMasjidId] = useState(urlMasjidId);
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");

  // Keep local state in sync with the URL — both when the URL changes out
  // from under us (e.g. a Wall link landing here with a different masjidId)
  // and, via the select's onChange below, the other way around.
  useEffect(() => { setMasjidId(urlMasjidId); }, [urlMasjidId]);

  const changeMasjidFilter = (value) => {
    setMasjidId(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set("masjidId", value);
      else next.delete("masjidId");
      return next;
    });
  };

  useEffect(() => {
    masjidApi.get("/mine").then(({ data }) => {
      setMasjids([...data.masjids].sort((a, b) => a.name.localeCompare(b.name)));
      // Nothing to pick from with a single masjid — scope to it automatically
      // instead of making the owner filter for their only option.
      if (!urlMasjidId && data.masjids.length === 1) changeMasjidFilter(String(data.masjids[0].id));
    }).catch(() => setMasjids([]));
  }, [urlMasjidId]);

  useEffect(() => {
    campaignApi
      .get("/mine", { params: masjidId ? { masjidId } : undefined })
      .then(({ data }) => setCampaigns(data.campaigns))
      .catch(() => setError("Couldn't load your campaigns."));
  }, [masjidId]);

  const startCampaignLink = masjidId ? `/account/my-campaigns/new?masjidId=${masjidId}` : "/account/my-campaigns/new";
  const selectedMasjid = masjids?.find((m) => String(m.id) === String(masjidId));

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">Your Campaigns</span>
            <h1>My Campaigns</h1>
            <p>Launch and track fundraising campaigns for your verified masjids.</p>
          </div>
          <Link to={startCampaignLink} className="btn btn-gold" style={{ marginLeft: "auto" }}>
            <Icon name="plus" size={16} /> Start a Campaign
          </Link>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {masjids && masjids.length > 1 && (
            <div className="auth-field" style={{ maxWidth: 320, marginBottom: 24 }}>
              <label>Filter by Masjid</label>
              <select value={masjidId} onChange={(e) => changeMasjidFilter(e.target.value)}>
                <option value="">All Masjids</option>
                {masjids.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          {campaigns && campaigns.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="flag" size={30} />
              <h3>{selectedMasjid ? `No campaigns yet for ${selectedMasjid.name}` : "You haven't started a campaign yet"}</h3>
              <p>Once your masjid is approved, you can launch a campaign to raise funds for a specific project.</p>
              <Link to={startCampaignLink} className="btn btn-gold">Start a Campaign <span className="btn-arrow">→</span></Link>
            </div>
          )}

          <div className="msj-list-grid">
            {campaigns?.map((c) => {
              const pct = c.progressPercent ?? 0;
              return (
                <div className="msj-list-card" key={c.id}>
                  <div className="msj-list-thumb">
                    <MediaThumb src={c.coverPhotoUrl ? `${API_ORIGIN}${c.coverPhotoUrl}` : null} />
                  </div>
                  <div className="msj-list-body">
                    <div className="msj-list-top">
                      <h3>{c.title}</h3>
                      <span className={`acct-status-pill ${c.status}`}>{STATUS_LABEL[c.status]}</span>
                    </div>
                    {c.goalAmount && (
                      <div className="camp-card-progress">
                        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                        <div className="camp-card-meta">
                          <span><strong>₹{Number(c.amountRaised).toLocaleString("en-IN")}</strong> raised</span>
                          <span>of ₹{Number(c.goalAmount).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    )}
                    <p className="msj-list-meta">Created {formatDate(c.createdAt)}</p>
                    <div className="msj-list-actions">
                      <Link to={`/account/my-campaigns/${c.id}`}>{EDITABLE.has(c.status) ? "Edit" : "View Details"}</Link>
                      {LIVE.has(c.status) && <Link to={`/campaign/${c.slug}`}>View Public Page</Link>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default MyCampaigns;
