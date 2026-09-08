import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../Icons.jsx";
import ShareMenu from "../ShareMenu.jsx";
import DonateModal from "./DonateModal.jsx";
import { getStoredUser } from "../../utils/userAuthStorage.js";

function CampaignDonationPanel({ campaign, category, donationAccount, slug }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [donateOpen, setDonateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef(null);

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);
  const pct = campaign.progressPercent ?? 0;
  const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;
  const raised = Number(campaign.amountRaised) || 0;
  const remaining = goal ? Math.max(0, goal - raised) : null;
  const url = typeof window !== "undefined" ? `${window.location.origin}/campaign/${slug}` : `/campaign/${slug}`;

  return (
    <div className="card msj-profile-card camp-donate-panel">
      <h3>{campaign.title}</h3>
      <div className="progress-track" style={{ marginTop: 12 }}><div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
      <div className="camp-donate-stats">
        <div>
          <strong>₹{raised.toLocaleString("en-IN")}</strong>
          <span>raised</span>
        </div>
        {goal != null && (
          <div>
            <strong>₹{goal.toLocaleString("en-IN")}</strong>
            <span>goal</span>
          </div>
        )}
        {remaining != null && (
          <div>
            <strong>₹{remaining.toLocaleString("en-IN")}</strong>
            <span>remaining</span>
          </div>
        )}
      </div>
      <p className="msj-list-meta" style={{ marginTop: 4 }}>{campaign.donorCount ?? 0} contributions · {category?.name || campaign.donationType}</p>

      <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginTop: 18 }} onClick={() => setDonateOpen(true)}>
        <Icon name="heart" size={16} /> Donate to This Campaign
      </button>
      <button
        type="button"
        ref={shareBtnRef}
        className="btn btn-outline-ink"
        style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
        onClick={() => setShareOpen((s) => !s)}
      >
        <Icon name="link" size={15} /> Share Campaign
      </button>
      <ShareMenu
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        anchorRef={shareBtnRef}
        url={url}
        title={campaign.title}
        text={campaign.shortDescription || ""}
      />

      {donateOpen && <DonateModal campaign={campaign} donationAccount={donationAccount} slug={slug} user={user} onClose={() => setDonateOpen(false)} />}
    </div>
  );
}

export default CampaignDonationPanel;
