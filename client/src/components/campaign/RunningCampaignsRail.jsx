import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../Icons.jsx";
import MediaThumb from "../MediaThumb.jsx";
import { toCardShape } from "../../utils/campaignCardShape.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const RAIL_SIZE = 20;

// Left column of the campaign hub — every other running campaign, so a
// visitor can keep browsing without leaving the hub. Clicking a card is a
// normal client-side route change (React Router never hard-reloads), which
// is what re-fetches this campaign's own data in place.
function RunningCampaignsRail({ currentSlug }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [campaigns, setCampaigns] = useState(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      axios
        .get(`${API_BASE}/campaigns/public`, { params: { q: q || undefined, pageSize: RAIL_SIZE } })
        .then(({ data }) => setCampaigns(data.campaigns.map(toCardShape).filter((c) => c.slug !== currentSlug)))
        .catch(() => setCampaigns([]));
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [q, currentSlug]);

  return (
    <aside className="camp-rail">
      <div className="camp-rail-head">
        <span className="eyebrow">{t("campaignProfile.rail.title", "Running Campaigns")}</span>
      </div>
      <div className="msj-search camp-rail-search">
        <Icon name="search" size={14} />
        <input type="text" placeholder={t("campaignProfile.rail.searchPlaceholder", "Search campaigns…")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="camp-rail-list">
        {campaigns === null && <p className="msj-note">{t("campaignProfile.loading", "Loading…")}</p>}
        {campaigns && campaigns.length === 0 && <p className="msj-note">{t("campaignProfile.rail.empty", "No other campaigns right now.")}</p>}
        {campaigns?.map((c) => {
          const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
          return (
            <button key={c.id} type="button" className="camp-rail-card" onClick={() => navigate(`/campaign/${c.slug}`)}>
              <div className="camp-rail-card-img">
                <MediaThumb src={c.img || null} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div className="camp-rail-card-body">
                <div className="camp-rail-card-loc">{c.name}</div>
                <div className="camp-rail-card-title">{c.title}</div>
                <div className="progress-track camp-rail-progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                <div className="camp-rail-card-meta">
                  <span>₹{c.raised.toLocaleString("en-IN")} {t("campaignProfile.rail.raisedSuffix", "raised")}</span>
                  <span>{pct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default RunningCampaignsRail;
