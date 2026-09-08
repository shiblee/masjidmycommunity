import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import ShareMenu from "../ShareMenu.jsx";
import DonateModal from "./DonateModal.jsx";
import { getStoredUser } from "../../utils/userAuthStorage.js";

function CampaignDonationPanel({ campaign, category, donationAccount, slug }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(() => getStoredUser());
  const [donateOpen, setDonateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef(null);

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  // Round-trips through /auth: a logged-out "Donate" click sends the user to
  // sign in with ?redirect=/campaign/<slug>?donate=1, and Auth.jsx sends them
  // straight back here afterward — this effect notices the ?donate=1 marker,
  // reopens the modal automatically, and strips the marker so a refresh or
  // reshare of the URL doesn't keep reopening it.
  useEffect(() => {
    if (searchParams.get("donate") === "1" && user) {
      setDonateOpen(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("donate");
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openDonate = () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/campaign/${slug}?donate=1`)}`);
      return;
    }
    setDonateOpen(true);
  };
  const pct = Math.min(campaign.progressPercent ?? 0, 100);
  const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;
  const raised = Number(campaign.amountRaised) || 0;
  const remaining = goal ? Math.max(0, goal - raised) : null;
  const url = typeof window !== "undefined" ? `${window.location.origin}/campaign/${slug}` : `/campaign/${slug}`;

  return (
    <div className="card msj-profile-card camp-donate-panel">
      <div className="camp-donate-panel-head">
        <span className="camp-donate-eyebrow">Support this campaign</span>
        <button type="button" ref={shareBtnRef} className="camp-icon-btn" onClick={() => setShareOpen((s) => !s)} aria-label="Share campaign">
          <Icon name="link" size={14} />
        </button>
      </div>
      <h3>{campaign.title}</h3>

      <div className="camp-donate-hero-stat">
        <strong>₹{raised.toLocaleString("en-IN")}</strong>
        <span>{goal != null ? `raised of ₹${goal.toLocaleString("en-IN")} goal` : "raised"}</span>
      </div>
      <div className="progress-track camp-donate-progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      <div className="camp-donate-progress-meta">
        <span>{pct.toFixed(pct % 1 === 0 ? 0 : 1)}% funded</span>
        {remaining != null && <span>₹{remaining.toLocaleString("en-IN")} to go</span>}
      </div>

      <div className="camp-donate-substats">
        <div><strong>{campaign.donorCount ?? 0}</strong><span>{(campaign.donorCount ?? 0) === 1 ? "Donor" : "Donors"}</span></div>
        <div><strong>{category?.name || campaign.donationType}</strong><span>Category</span></div>
      </div>

      <button type="button" className="btn btn-gold camp-donate-cta" onClick={openDonate}>
        <Icon name="heart" size={16} /> Donate to This Campaign
      </button>

      <ShareMenu open={shareOpen} onClose={() => setShareOpen(false)} anchorRef={shareBtnRef} url={url} title={campaign.title} text={campaign.shortDescription || ""} />

      {donateOpen && <DonateModal campaign={campaign} donationAccount={donationAccount} slug={slug} user={user} onClose={() => setDonateOpen(false)} />}
    </div>
  );
}

export default CampaignDonationPanel;
