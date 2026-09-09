import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import ShareMenu from "../../components/ShareMenu.jsx";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { getUserToken } from "../../utils/userAuthStorage.js";
import { locationOf, StarRating, directionsUrl } from "./exploreMasjidsShared.jsx";
import SuggestEditForm from "./SuggestEditForm.jsx";
import ReviewForm from "./ReviewForm.jsx";
import ReviewRow from "./ReviewRow.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";
import { useMasjidLike } from "../../hooks/useMasjidLike.js";
import { formatCompactNumber } from "../../utils/formatCompactNumber.js";
import { trackMasjidView } from "../../utils/trackMasjidView.js";
import GreenTickBadge from "../../components/masjid/GreenTickBadge.jsx";

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
  const { t } = useTranslation();
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { liked: favorited, likeCount, toggle: toggleLike, busy: favBusy } = useMasjidLike(masjid.id, {
    liked: !!masjid.likedByMe,
    likeCount: masjid.likeCount || 0,
  });
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestSent, setSuggestSent] = useState(false);
  const [reviewSettings, setReviewSettings] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [prayerRoster, setPrayerRoster] = useState([]);
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
    axios
      .get(`${API}/${masjid.id}/prayer-times`)
      .then(({ data }) => setPrayerRoster(data.roster || []))
      .catch(() => setPrayerRoster([]));
    if (loggedIn) {
      const token = getUserToken();
      axios
        .get(`${API}/${masjid.id}/reviews/mine`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setMyReview(data.review))
        .catch(() => {});
    }
  };

  useEffect(() => {
    load();
    trackMasjidView(masjid.id, "popup");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjid.id]);

  const handleSaved = (review) => {
    setMyReview(review);
    setShowForm(false);
    load();
  };

  const toggleFavorite = async () => {
    const result = await toggleLike();
    if (result?.needsLogin) navigate("/auth");
  };

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal msj-modal-wide msj-review-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label={t("exploreMasjidsPage.modal.close", "Close")}><Icon name="x" size={16} /></button>

        {tab === "overview" ? (
          <div className="msj-review-photo-wrap">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="msj-review-modal-photo" />
            {masjid.photoCount > 0 && (
              <Link to={`/masjid/${masjid.slug || masjid.id}`} className="msj-review-see-photos">
                <Icon name="imageIcon" size={14} /> {t("exploreMasjidsPage.modal.seePhotos", "See Photos")}
              </Link>
            )}
          </div>
        ) : (
          <div className="msj-review-modal-header">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="msj-review-modal-cover" />
            <div>
              <span className="msj-card-title-row">
                <h3>{masjid.name}</h3>
                <GreenTickBadge masjid={masjid} variant="list" />
              </span>
              <div className="msj-review-modal-rating">
                <StarRating value={data?.average || 0} size={16} />
                {data && <span>{data.average.toFixed(1)} ({data.count} {data.count === 1 ? t("exploreMasjidsPage.modal.reviewSingular", "review") : t("exploreMasjidsPage.modal.reviewPlural", "reviews")})</span>}
              </div>
              <p className="msj-list-loc"><Icon name="mapPin" size={13} /> {locationOf(masjid)}</p>
            </div>
          </div>
        )}

        {tab === "overview" && (
          <div className="msj-review-modal-titleblock">
            <span className="msj-card-title-row">
              <h3>{masjid.name}</h3>
              <GreenTickBadge masjid={masjid} variant="list" />
            </span>
            <div className="msj-review-modal-rating">
              <StarRating value={data?.average || 0} size={16} />
              {data && <span>{data.average.toFixed(1)} ({data.count} {data.count === 1 ? t("exploreMasjidsPage.modal.reviewSingular", "review") : t("exploreMasjidsPage.modal.reviewPlural", "reviews")})</span>}
              {masjid.viewCount > 0 && (
                <span className="msj-review-modal-views"><Icon name="eye" size={13} /> {formatCompactNumber(masjid.viewCount)} {t("exploreMasjidsPage.modal.views", "views")}</span>
              )}
            </div>
            <p className="msj-list-loc"><Icon name="mapPin" size={13} /> {locationOf(masjid)}</p>
          </div>
        )}

        <div className="msj-review-tabs">
          <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>{t("exploreMasjidsPage.tabs.overview", "Overview")}</button>
          <button type="button" className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>{t("exploreMasjidsPage.tabs.reviews", "Reviews")}</button>
          <button type="button" className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}>{t("exploreMasjidsPage.tabs.about", "About")}</button>
        </div>

        {tab === "overview" && (
          <div className="msj-review-overview">
            <div className="msj-review-actions-row">
              {directionsUrl(masjid) ? (
                <a href={directionsUrl(masjid)} target="_blank" rel="noopener noreferrer" className="msj-review-action-btn">
                  <span className="msj-review-action-icon"><Icon name="compass" size={20} /></span>
                  {t("exploreMasjidsPage.modal.directions", "Directions")}
                </a>
              ) : (
                <span className="msj-review-action-btn disabled" title={t("exploreMasjidsPage.modal.locationNotSet", "Location not set for this masjid")}>
                  <span className="msj-review-action-icon"><Icon name="compass" size={20} /></span>
                  {t("exploreMasjidsPage.modal.directions", "Directions")}
                </span>
              )}
              <button type="button" className={`msj-review-action-btn ${favorited ? "active" : ""}`} onClick={toggleFavorite} disabled={favBusy}>
                <span className="msj-review-action-icon"><HeartIcon filled={favorited} /></span>
                {favorited ? t("exploreMasjidsPage.modal.liked", "Liked") : t("exploreMasjidsPage.modal.like", "Like")}{likeCount > 0 ? ` · ${formatCompactNumber(likeCount)}` : ""}
              </button>
              <button type="button" ref={shareBtnRef} className="msj-review-action-btn" onClick={() => setShareOpen((v) => !v)}>
                <span className="msj-review-action-icon"><ShareIcon /></span>
                {t("exploreMasjidsPage.modal.share", "Share")}
              </button>
              <ShareMenu
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                anchorRef={shareBtnRef}
                url={`${window.location.origin}/masjid/${masjid.slug || masjid.id}`}
                title={masjid.name}
              />
            </div>

            {(masjid.formattedAddress || masjid.address) && (
              <p className="msj-review-address"><Icon name="mapPin" size={15} /> {masjid.formattedAddress || masjid.address}</p>
            )}

            <Link to={`/masjid/${masjid.slug || masjid.id}`} className="btn btn-outline-ink msj-review-view-profile">{t("exploreMasjidsPage.modal.viewFullProfile", "View Full Profile")}</Link>

            <div className="msj-suggest-edit">
              {suggestSent ? (
                <p className="msj-suggest-edit-sent"><Icon name="check" size={15} /> {t("exploreMasjidsPage.modal.suggestSent", "Thanks! Your correction request has been sent for review.")}</p>
              ) : showSuggest ? (
                loggedIn ? (
                  <SuggestEditForm masjid={masjid} onDone={() => { setShowSuggest(false); setSuggestSent(true); }} onCancel={() => setShowSuggest(false)} />
                ) : (
                  <p className="msj-review-login-prompt"><Link to="/auth">{t("exploreMasjidsPage.modal.signIn", "Sign in")}</Link> {t("exploreMasjidsPage.modal.signInSuggestSuffix", "to suggest an edit.")}</p>
                )
              ) : (
                <button type="button" className="msj-suggest-edit-link" onClick={() => setShowSuggest(true)}>{t("exploreMasjidsPage.modal.suggestEdit", "Suggest an edit")}</button>
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
                  {myReview ? t("exploreMasjidsPage.modal.editReview", "Edit Your Review") : t("exploreMasjidsPage.modal.writeReview", "Write a Review")}
                </button>
              ) : (
                <p className="msj-review-login-prompt"><Link to="/auth">{t("exploreMasjidsPage.modal.signIn", "Sign in")}</Link> {t("exploreMasjidsPage.modal.signInReviewSuffix", "to write a review.")}</p>
              )
            )}

            {showForm && (
              <ReviewForm masjidId={masjid.id} existing={myReview} settings={reviewSettings} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
            )}

            <div className="msj-review-list">
              {data?.reviews.length === 0 && <p className="msj-review-empty">{t("exploreMasjidsPage.modal.noReviewsYet", "No reviews yet — be the first to share your experience.")}</p>}
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
                <h4 className="msj-review-about-heading">{t("exploreMasjidsPage.modal.aboutMasjid", "About the Masjid")}</h4>
                <p className="msj-review-about">{masjid.about}</p>
              </>
            ) : (
              <p className="msj-review-empty">{t("exploreMasjidsPage.modal.noDescription", "No description added yet.")}</p>
            )}

            {prayerRoster.length > 0 && (
              <div className="msj-review-prayer">
                <h4 className="msj-review-about-heading">{t("prayer.rosterHeading", "Today's Prayer Times")}</h4>
                <div className="msj-review-prayer-grid">
                  {prayerRoster.map((p) => (
                    <div className="msj-review-prayer-card" key={p.prayerId}>
                      <span className="msj-review-prayer-name">{t(`prayer.${p.name.toLowerCase()}`, p.name)}</span>
                      <span className="msj-review-prayer-time">{p.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contacts.length > 0 && (
              <div className="msj-review-contacts">
                <h4 className="msj-review-about-heading">{t("exploreMasjidsPage.modal.communityMembers", "Community Members")}</h4>
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
