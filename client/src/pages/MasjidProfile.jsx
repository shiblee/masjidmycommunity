import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import StaticLocationMap from "../components/StaticLocationMap.jsx";
import MediaThumb from "../components/MediaThumb.jsx";
import axios from "axios";

const API = "http://localhost:5050/api/masjids/public";
const CAMPAIGN_API = "http://localhost:5050/api/campaigns/public";

function MasjidProfile() {
  const { id } = useParams();
  const [masjid, setMasjid] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    axios
      .get(`${API}/${id}`)
      .then(({ data }) => {
        setMasjid(data.masjid);
        setPhotos(data.photos);
        // Open on the actual cover, not just whatever sorts first — the
        // first-uploaded item can be a video, which shouldn't be the default
        // hero view.
        const coverIndex = data.photos.findIndex((p) => p.isCover);
        setActive(coverIndex >= 0 ? coverIndex : 0);
      })
      .catch(() => setNotFound(true));
    axios.get(`${CAMPAIGN_API}/by-masjid/${id}`).then(({ data }) => setCampaigns(data.campaigns)).catch(() => {});
  }, [id]);

  if (notFound) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg msj-empty-state">
          <Icon name="mosque" size={30} />
          <h3>This masjid isn't available</h3>
          <p>It may not be approved yet, or the link may be incorrect.</p>
          <Link to="/explore-masjids" className="btn btn-gold">Explore Masjids</Link>
        </div>
      </main>
    );
  }

  if (!masjid) return <main className="msj-page"><div className="wrap py-lg"><p>Loading…</p></div></main>;

  const cover = photos[active] || photos[0];

  return (
    <main className="msj-page">
      <section className="msj-profile-hero on-ink">
        {cover && (
          <MediaThumb src={`http://localhost:5050${cover.url}`} mediaType={cover.mediaType} className="msj-profile-hero-img" videoProps={{ controls: true }} />
        )}
        <div className="msj-profile-hero-overlay" />
        <div className="wrap msj-profile-hero-content">
          <span className="msj-verified-badge"><Icon name="shieldCheck" size={13} /> Verified Masjid</span>
          <h1>{masjid.name}</h1>
          {masjid.tagline && <p className="msj-profile-tagline">{masjid.tagline}</p>}
          <p className="msj-list-loc"><Icon name="mapPin" size={15} /> {[masjid.address, masjid.city, masjid.country].filter(Boolean).join(", ")}</p>
        </div>
      </section>

      <section className="py-md">
        <div className="wrap msj-profile-grid">
          <div>
            {photos.length > 1 && (
              <div className="msj-profile-thumbs">
                {photos.map((p, i) => (
                  <button key={p.id} type="button" className={i === active ? "active" : ""} onClick={() => setActive(i)}>
                    {p.mediaType === "video" ? (
                      <span className="msj-thumb-video">
                        <MediaThumb src={`http://localhost:5050${p.url}`} mediaType="video" />
                        <Icon name="play" size={14} />
                      </span>
                    ) : (
                      <MediaThumb src={`http://localhost:5050${p.url}`} />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="section-head" style={{ marginTop: 32 }}>
              <span className="eyebrow">About</span>
              <h2>{masjid.name}</h2>
            </div>
            <p className="msj-profile-about">{masjid.about}</p>

            <div className="msj-profile-facts">
              {masjid.yearEstablished && <div><span>Established</span><strong>{masjid.yearEstablished}</strong></div>}
              {masjid.category && <div><span>Category</span><strong>{masjid.category}</strong></div>}
              {masjid.imamName && <div><span>Imam</span><strong>{masjid.imamName}</strong></div>}
            </div>

            {masjid.latitude != null && (
              <>
                <div className="section-head" style={{ marginTop: 40, marginBottom: 0 }}>
                  <span className="eyebrow">Location</span>
                </div>
                <StaticLocationMap latitude={masjid.latitude} longitude={masjid.longitude} height={300} />
              </>
            )}

            {masjid.mapLink && (
              <a href={masjid.mapLink} target="_blank" rel="noreferrer" className="btn btn-outline-ink" style={{ marginTop: 20 }}>
                <Icon name="mapPin" size={16} /> Get Directions
              </a>
            )}
          </div>

          <aside className="msj-profile-side">
            <div className="card msj-profile-card">
              <h3>Support {masjid.name}</h3>
              {campaigns.length === 0 ? (
                <>
                  <p>Campaigns from this masjid will appear here once launched.</p>
                  <button className="btn btn-gold" style={{ width: "100%" }} type="button" disabled title="No active campaigns from this masjid right now.">
                    No Active Campaigns
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {campaigns.map((c) => {
                    const pct = c.progressPercent ?? 0;
                    return (
                      <Link to={`/campaign/${c.slug}`} key={c.id} className="camp-side-card">
                        <strong>{c.title}</strong>
                        <div className="progress-track" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                        <div className="camp-card-meta" style={{ marginTop: 6 }}>
                          <span>₹{Number(c.amountRaised).toLocaleString("en-IN")} raised</span>
                          {c.goalAmount && <span>of ₹{Number(c.goalAmount).toLocaleString("en-IN")}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default MasjidProfile;
