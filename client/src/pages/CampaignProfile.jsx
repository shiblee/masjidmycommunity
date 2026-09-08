import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import MediaThumb from "../components/MediaThumb.jsx";
import axios from "axios";
import { API_BASE, API_ORIGIN } from "../config.js";
import { formatDate } from "../utils/formatDateTime.js";
import EngagementRow from "../components/masjid/EngagementRow.jsx";
import GreenTickBadge from "../components/masjid/GreenTickBadge.jsx";
import RunningCampaignsRail from "../components/campaign/RunningCampaignsRail.jsx";
import CampaignDonationPanel from "../components/campaign/CampaignDonationPanel.jsx";
import CampaignDonorsList from "../components/campaign/CampaignDonorsList.jsx";
import CampaignPostSection from "../components/campaign/CampaignPostSection.jsx";

const API = `${API_BASE}/campaigns/public`;

function CampaignProfile() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    axios
      .get(`${API}/${slug}`)
      .then(({ data }) => {
        setData(data);
        const coverIndex = data.photos.findIndex((p) => p.isCover);
        setActive(coverIndex >= 0 ? coverIndex : 0);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg msj-empty-state">
          <Icon name="flag" size={30} />
          <h3>This campaign isn't available</h3>
          <p>It may not be live yet, or the link may be incorrect.</p>
          <Link to="/explore-campaigns" className="btn btn-gold">Explore Campaigns</Link>
        </div>
      </main>
    );
  }

  if (!data) return <main className="msj-page"><div className="wrap py-lg"><p>Loading…</p></div></main>;

  const { campaign, photos, budgetItems, updates, masjid, category, donationAccount } = data;
  const cover = photos[active] || photos[0];

  return (
    <main className="msj-page">
      <section className="msj-profile-hero on-ink">
        {cover && <MediaThumb src={`${API_ORIGIN}${cover.url}`} mediaType={cover.mediaType} className="msj-profile-hero-img" videoProps={{ controls: true }} />}
        <div className="msj-profile-hero-overlay" />
        <div className="wrap msj-profile-hero-content">
          <h1>{campaign.title}</h1>
          {campaign.shortDescription && <p className="msj-profile-tagline">{campaign.shortDescription}</p>}
          <p className="msj-list-loc">
            <Icon name="mosque" size={15} />{" "}
            {masjid?.id ? <Link to={`/masjid/${masjid.id}`} className="msj-campaign-masjid-link">{masjid.name}</Link> : masjid?.name}
            {masjid?.id && <GreenTickBadge masjid={masjid} variant="list" />}
            {" · "}{[masjid?.city, masjid?.country].filter(Boolean).join(", ")}
          </p>
          {masjid?.id && <EngagementRow masjid={masjid} variant="list" className="msj-campaign-masjid-engagement" />}
        </div>
      </section>

      <section className="py-md camp-hub-content">
        <div className="wrap camp-hub-grid">
          <RunningCampaignsRail currentSlug={slug} />

          <div>
            {photos.length > 1 && (
              <div className="msj-profile-thumbs">
                {photos.map((p, i) => (
                  <button key={p.id} type="button" className={i === active ? "active" : ""} onClick={() => setActive(i)}>
                    {p.mediaType === "video" ? (
                      <span className="msj-thumb-video"><MediaThumb src={`${API_ORIGIN}${p.url}`} mediaType="video" /><Icon name="play" size={14} /></span>
                    ) : (
                      <MediaThumb src={`${API_ORIGIN}${p.url}`} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {campaign.donationType === "Zakat" && <span className="camp-zakat-badge" style={{ marginTop: 32 }}><Icon name="check" size={12} /> Zakat Eligible</span>}

            <div className="section-head" style={{ marginTop: campaign.donationType === "Zakat" ? 12 : 32 }}>
              <span className="eyebrow">About This Campaign</span>
              <h2>{campaign.title}</h2>
            </div>
            <p className="msj-profile-about">{campaign.description}</p>
            {campaign.donationType === "Zakat" && campaign.zakatEligibilityNote && (
              <p className="msj-note" style={{ marginTop: 12 }}><strong>Zakat eligibility:</strong> {campaign.zakatEligibilityNote}</p>
            )}

            <CampaignPostSection campaignId={campaign.id} />

            {budgetItems.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: 40, marginBottom: 0 }}>
                  <span className="eyebrow">Funding Breakdown</span>
                  <h2>Where the funds go</h2>
                </div>
                <table className="camp-budget-table">
                  <tbody>
                    {budgetItems.map((b) => (
                      <tr key={b.id}><td>{b.label}</td><td>₹{Number(b.amount).toLocaleString("en-IN")}</td></tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {updates.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: 40, marginBottom: 0 }}>
                  <span className="eyebrow">Progress</span>
                  <h2>Campaign Updates</h2>
                </div>
                <div style={{ marginTop: 12 }}>
                  {updates.map((u) => (
                    <div className="camp-update-card" key={u.id}>
                      <time>{formatDate(u.createdAt)}</time>
                      <h4>{u.title}</h4>
                      <p>{u.body}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="msj-profile-side camp-profile-side">
            <CampaignDonationPanel campaign={campaign} category={category} donationAccount={donationAccount} slug={slug} />
            <CampaignDonorsList slug={slug} campaignTitle={campaign.title} donorCount={campaign.donorCount} />
          </aside>
        </div>
      </section>
    </main>
  );
}

export default CampaignProfile;
