import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { getUserToken } from "../../utils/userAuthStorage.js";
import { locationOf, StarRating, directionsUrl } from "./exploreMasjidsShared.jsx";
import SuggestEditForm from "./SuggestEditForm.jsx";
import ReviewForm from "./ReviewForm.jsx";
import ReviewRow from "./ReviewRow.jsx";

const API = `${API_BASE}/masjids/public`;

function HeartIcon({ filled, size = 20 }) {
  const path = "M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.8 4 5.2c2-1.2 4.4-.6 5.7 1 .7.8 1.4 1.8 2.3 1.8s1.6-1 2.3-1.8c1.3-1.6 3.7-2.2 5.7-1 2.6 1.6 3.2 4.9 1.3 7.7C18.7 16.65 12 21 12 21z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#C24B3F" : "none"} stroke={filled ? "#C24B3F" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function ShareIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function MasjidReviewModal({ masjid, initialTab = "overview", onClose }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestSent, setSuggestSent] = useState(false);
  const [reviewSettings, setReviewSettings] = useState(null);
  const [contacts, setContacts] = useState([]);
  const loggedIn = !!getUserToken();

  useEffect(() => {
    axios.get(`${API}/review-settings`).then(({ data }) => setReviewSettings(data)).catch(() => {});
  }, []);

  const load = () => {
    axios
      .get(`${API}/${masjid.id}/reviews`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ average: 0, count: 0, breakdown: {}, reviews: [] }));
    axios
      .get(`${API}/${masjid.id}/contacts`)
      .then(({ data }) => setContacts(data.contacts || []))
      .catch(() => setContacts([]));
    if (loggedIn) {
      const token = getUserToken();
      axios
        .get(`${API}/${masjid.id}/reviews/mine`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setMyReview(data.review))
        .catch(() => {});
      axios
        .get(`${API}/${masjid.id}/favorite`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setFavorited(data.favorited))
        .catch(() => {});
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjid.id]);

  const handleSaved = (review) => {
    setMyReview(review);
    setShowForm(false);
    load();
  };

  const toggleFavorite = async () => {
    if (!loggedIn) { navigate("/auth"); return; }
    setFavBusy(true);
    const token = getUserToken();
    try {
      if (favorited) {
        await axios.delete(`${API}/${masjid.id}/favorite`, { headers: { Authorization: `Bearer ${token}` } });
        setFavorited(false);
      } else {
        await axios.post(`${API}/${masjid.id}/favorite`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setFavorited(true);
      }
    } catch {
      // no-op — the button simply won't change state, safe to retry
    } finally {
      setFavBusy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/masjid/${masjid.id}`;
    if (navigator.share) {
      navigator.share({ title: masjid.name, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("Link Copied!");
      setTimeout(() => setShareLabel("Share"), 2000);
    } catch {
      setShareLabel("Couldn't copy");
      setTimeout(() => setShareLabel("Share"), 2000);
    }
  };

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal msj-modal-wide msj-review-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>

        {tab === "overview" ? (
          <div className="msj-review-photo-wrap">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="msj-review-modal-photo" />
            {masjid.photoCount > 0 && (
              <Link to={`/masjid/${masjid.id}`} className="msj-review-see-photos">
                <Icon name="imageIcon" size={14} /> See Photos
              </Link>
            )}
          </div>
        ) : (
          <div className="msj-review-modal-header">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="msj-review-modal-cover" />
            <div>
              <h3>{masjid.name}</h3>
              <div className="msj-review-modal-rating">
                <StarRating value={data?.average || 0} size={16} />
                {data && <span>{data.average.toFixed(1)} ({data.count} review{data.count === 1 ? "" : "s"})</span>}
              </div>
              <p className="msj-list-loc"><Icon name="mapPin" size={13} /> {locationOf(masjid)}</p>
            </div>
          </div>
        )}

        {tab === "overview" && (
          <div className="msj-review-modal-titleblock">
            <h3>{masjid.name}</h3>
            <div className="msj-review-modal-rating">
              <StarRating value={data?.average || 0} size={16} />
              {data && <span>{data.average.toFixed(1)} ({data.count} review{data.count === 1 ? "" : "s"})</span>}
            </div>
            <p className="msj-list-loc"><Icon name="mapPin" size={13} /> {locationOf(masjid)}</p>
          </div>
        )}

        <div className="msj-review-tabs">
          <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
          <button type="button" className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>Reviews</button>
          <button type="button" className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}>About</button>
        </div>

        {tab === "overview" && (
          <div className="msj-review-overview">
            <div className="msj-review-actions-row">
              {directionsUrl(masjid) ? (
                <a href={directionsUrl(masjid)} target="_blank" rel="noopener noreferrer" className="msj-review-action-btn">
                  <span className="msj-review-action-icon"><Icon name="compass" size={20} /></span>
                  Directions
                </a>
              ) : (
                <span className="msj-review-action-btn disabled" title="Location not set for this masjid">
                  <span className="msj-review-action-icon"><Icon name="compass" size={20} /></span>
                  Directions
                </span>
              )}
              <button type="button" className={`msj-review-action-btn ${favorited ? "active" : ""}`} onClick={toggleFavorite} disabled={favBusy}>
                <span className="msj-review-action-icon"><HeartIcon filled={favorited} /></span>
                {favorited ? "Liked" : "Like"}
              </button>
              <button type="button" className="msj-review-action-btn" onClick={handleShare}>
                <span className="msj-review-action-icon"><ShareIcon /></span>
                {shareLabel}
              </button>
            </div>

            {(masjid.formattedAddress || masjid.address) && (
              <p className="msj-review-address"><Icon name="mapPin" size={15} /> {masjid.formattedAddress || masjid.address}</p>
            )}

            <Link to={`/masjid/${masjid.id}`} className="btn btn-outline-ink msj-review-view-profile">View Full Profile</Link>

            <div className="msj-suggest-edit">
              {suggestSent ? (
                <p className="msj-suggest-edit-sent"><Icon name="check" size={15} /> Thanks! Your correction request has been sent for review.</p>
              ) : showSuggest ? (
                loggedIn ? (
                  <SuggestEditForm masjid={masjid} onDone={() => { setShowSuggest(false); setSuggestSent(true); }} onCancel={() => setShowSuggest(false)} />
                ) : (
                  <p className="msj-review-login-prompt"><Link to="/auth">Sign in</Link> to suggest an edit.</p>
                )
              ) : (
                <button type="button" className="msj-suggest-edit-link" onClick={() => setShowSuggest(true)}>Suggest an edit</button>
              )}
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <div className="msj-review-list-panel">
            {data && data.count > 0 && (
              <div className="msj-rating-breakdown">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div className="msj-rating-breakdown-row" key={n}>
                    <span>{n}</span>
                    <div className="msj-rating-breakdown-track">
                      <div className="msj-rating-breakdown-fill" style={{ width: `${data.count ? (data.breakdown[n] / data.count) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showForm && (
              loggedIn ? (
                <button type="button" className="btn btn-gold" onClick={() => setShowForm(true)}>
                  {myReview ? "Edit Your Review" : "Write a Review"}
                </button>
              ) : (
                <p className="msj-review-login-prompt"><Link to="/auth">Sign in</Link> to write a review.</p>
              )
            )}

            {showForm && (
              <ReviewForm masjidId={masjid.id} existing={myReview} settings={reviewSettings} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
            )}

            <div className="msj-review-list">
              {data?.reviews.length === 0 && <p className="msj-review-empty">No reviews yet — be the first to share your experience.</p>}
              {data?.reviews.map((r) => <ReviewRow review={r} key={r.id} />)}
            </div>
          </div>
        )}

        {tab === "about" && (
          <div className="msj-review-about-panel">
            {masjid.tagline && <p className="msj-review-tagline">{masjid.tagline}</p>}
            {masjid.category && <span className="msj-category-badge">{masjid.category}</span>}
            {masjid.about ? (
              <>
                <h4 className="msj-review-about-heading">About the Masjid</h4>
                <p className="msj-review-about">{masjid.about}</p>
              </>
            ) : (
              <p className="msj-review-empty">No description added yet.</p>
            )}

            {contacts.length > 0 && (
              <div className="msj-review-contacts">
                <h4 className="msj-review-about-heading">Community Members</h4>
                <div className="msj-review-contact-list">
                  {contacts.map((c) => (
                    <div key={c.id} className="msj-review-contact-card">
                      <div className="msj-review-contact-avatar"><Icon name="people" size={17} /></div>
                      <div className="msj-review-contact-info">
                        <strong>{c.name}</strong>
                        <span className="msj-review-contact-designation">{c.designation}</span>
                      </div>
                      <a href={`tel:${c.mobile}`} className="msj-review-contact-call">
                        <Icon name="phone" size={14} /> {c.mobile}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MasjidReviewModal;
