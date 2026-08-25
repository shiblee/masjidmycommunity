import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import campaignApi from "../../services/campaignApi.js";
import MediaThumb from "../../components/MediaThumb.jsx";

const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review", changes_requested: "Changes Requested",
  approved: "Approved", active: "Active", paused: "Paused", goal_reached: "Goal Reached",
  completed: "Completed", rejected: "Rejected", cancelled: "Cancelled",
};
const EDITABLE = new Set(["draft", "changes_requested"]);
const LIVE = new Set(["active", "paused", "goal_reached", "completed"]);

function MyCampaigns() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    campaignApi.get("/mine").then(({ data }) => setCampaigns(data.campaigns)).catch(() => setError("Couldn't load your campaigns."));
  }, []);

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">Your Campaigns</span>
            <h1>My Campaigns</h1>
            <p>Launch and track fundraising campaigns for your verified masjids.</p>
          </div>
          <Link to="/account/campaigns/new" className="btn btn-gold" style={{ marginLeft: "auto" }}>
            <Icon name="plus" size={16} /> Start a Campaign
          </Link>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {campaigns && campaigns.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="flag" size={30} />
              <h3>You haven't started a campaign yet</h3>
              <p>Once your masjid is approved, you can launch a campaign to raise funds for a specific project.</p>
              <Link to="/account/campaigns/new" className="btn btn-gold">Start a Campaign <span className="btn-arrow">→</span></Link>
            </div>
          )}

          <div className="msj-list-grid">
            {campaigns?.map((c) => {
              const pct = c.progressPercent ?? 0;
              return (
                <div className="msj-list-card" key={c.id}>
                  <div className="msj-list-thumb">
                    <MediaThumb src={c.coverPhotoUrl ? `http://localhost:5050${c.coverPhotoUrl}` : null} />
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
                    <p className="msj-list-meta">Created {new Date(c.createdAt).toLocaleDateString()}</p>
                    <div className="msj-list-actions">
                      <Link to={`/account/campaigns/${c.id}`}>{EDITABLE.has(c.status) ? "Edit" : "View Details"}</Link>
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
