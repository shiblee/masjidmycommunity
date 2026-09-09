import React, { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Icon } from "../components/Icons.jsx";
import MediaThumb from "../components/MediaThumb.jsx";
import ShareMenu from "../components/ShareMenu.jsx";
import { API_BASE, API_ORIGIN } from "../config.js";
import { getUserToken } from "../utils/userAuthStorage.js";
import { StarRating, directionsUrl } from "./exploreMasjids/exploreMasjidsShared.jsx";
import SuggestEditForm from "./exploreMasjids/SuggestEditForm.jsx";
import MediaGallery from "./masjidHub/MediaGallery.jsx";
import NearbyMasjidPanel from "./masjidHub/NearbyMasjidPanel.jsx";
import ReviewsTab from "./masjidHub/ReviewsTab.jsx";
import CommunityWallTab from "./masjidHub/CommunityWallTab.jsx";
import PrayerTimesTab from "./masjidHub/PrayerTimesTab.jsx";
import PeopleWhoLikedTab from "./masjidHub/PeopleWhoLikedTab.jsx";
import { useMasjidLike } from "../hooks/useMasjidLike.js";
import GreenTickBadge from "../components/masjid/GreenTickBadge.jsx";
import { trackMasjidView } from "../utils/trackMasjidView.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const API = `${API_BASE}/masjids/public`;

const TAB_DEFS = [
  { key: "about" },
  { key: "prayer-times" },
  { key: "community-wall" },
  { key: "people" },
  { key: "campaigns" },
  { key: "media" },
  { key: "reviews" },
  { key: "location" },
  { key: "more" },
];
const DEFAULT_TAB = "about";
const TAB_KEYS = new Set(TAB_DEFS.map((t) => t.key));

function LikeAvatarStack({ topLikers, likeCount, onClick }) {
  if (!likeCount) return null;
  const extra = likeCount - topLikers.length;
  return (
    <button type="button" className="msj-hub-liker-stack" onClick={onClick}>
      {topLikers.map((u, i) => (
        <MediaThumb key={u.id} src={u.profilePhoto ? `${API_ORIGIN}${u.profilePhoto}` : null} className="msj-hub-liker-avatar" style={{ zIndex: topLikers.length - i }} />
      ))}
      {extra > 0 && <span className="msj-hub-liker-more">+{extra.toLocaleString()}</span>}
    </button>
  );
}

function ComingSoonPanel({ label }) {
  const { t } = useTranslation();
  return (
    <div className="msj-hub-coming-soon">
      <Icon name="sparkle" size={26} />
      <strong>{label}</strong>
      <span>{t("masjidProfile.comingSoon.body", "This section is being built out and will appear here soon.")}</span>
    </div>
  );
}

function InfoCard({ icon, label, children }) {
  if (!children) return null;
  return (
    <div className="msj-hub-info-card">
      <span className="msj-hub-info-card-icon"><Icon name={icon} size={18} /></span>
      <div>
        <span className="msj-hub-info-card-label">{label}</span>
        <div className="msj-hub-info-card-value">{children}</div>
      </div>
    </div>
  );
}

function MasjidProfile() {
  const { t } = useTranslation();
  const { slug: slugParam, tab: tabParam } = useParams();
  const navigate = useNavigate();
  const [masjid, setMasjid] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const tab = TAB_KEYS.has(tabParam) ? tabParam : DEFAULT_TAB;

  const TABS = [
    { key: "about", label: t("masjidProfile.tabs.about", "About") },
    { key: "prayer-times", label: t("masjidProfile.tabs.prayerTimes", "Prayer Times") },
    { key: "community-wall", label: t("masjidProfile.tabs.communityWall", "Community Wall") },
    { key: "people", label: t("masjidProfile.tabs.people", "People") },
    { key: "campaigns", label: t("masjidProfile.tabs.campaigns", "Campaigns") },
    { key: "media", label: t("masjidProfile.tabs.media", "Media") },
    { key: "reviews", label: t("masjidProfile.tabs.reviewsRatings", "Reviews & Ratings") },
    { key: "location", label: t("masjidProfile.tabs.location", "Location") },
    { key: "more", label: t("masjidProfile.tabs.more", "More") },
  ];
  // The numeric id (once loaded) — every internal API call (likes, reviews,
  // prayer times, nearby list...) still uses this, exactly as before; only
  // the visible URL and outbound share links use the slug.
  const id = masjid?.id;
  const setTab = (key) => navigate(`/masjid/${masjid.slug || slugParam}/${key}`);
  const { liked: favorited, likeCount, toggle: toggleLike, busy: favBusy } = useMasjidLike(id, {
    liked: !!masjid?.likedByMe,
    likeCount: masjid?.likeCount || 0,
  });
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestSent, setSuggestSent] = useState(false);
  const loggedIn = !!getUserToken();

  const load = () => {
    axios
      .get(`${API}/${slugParam}`)
      .then(({ data }) => {
        setMasjid(data.masjid);
        setPhotos(data.photos);
        trackMasjidView(data.masjid.id, "detail");
      })
      .catch(() => setNotFound(true));
  };

  useEffect(() => { load(); }, [slugParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // A link built before this masjid had a slug, or a legacy numeric-id link
  // (still fully supported server-side) — once loaded, settle the address
  // bar on the one canonical URL rather than leaving it showing the id.
  useEffect(() => {
    if (masjid?.slug && slugParam !== masjid.slug) {
      navigate(`/masjid/${masjid.slug}${tabParam ? `/${tabParam}` : ""}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjid?.slug, slugParam]);

  const toggleFavorite = async () => {
    const result = await toggleLike();
    if (result?.needsLogin) navigate("/auth");
  };

  if (notFound) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg msj-empty-state">
          <Icon name="mosque" size={30} />
          <h3>{t("masjidProfile.notFound.title", "This masjid isn't available")}</h3>
          <p>{t("masjidProfile.notFound.body", "It may not be approved yet, or the link may be incorrect.")}</p>
          <Link to="/explore-masjids" className="btn btn-gold">{t("masjidProfile.notFound.cta", "Masjids")}</Link>
        </div>
      </main>
    );
  }

  if (!masjid) return <main className="msj-page"><div className="wrap py-lg"><p>{t("masjidProfile.loading", "Loading…")}</p></div></main>;

  const cover = photos.find((p) => p.isCover) || photos[0];
  const address = masjid.formattedAddress || [masjid.address, masjid.city, masjid.country].filter(Boolean).join(", ");
  const dirUrl = directionsUrl(masjid);

  return (
    <main className="msj-page msj-hub">
      <section className="msj-hub-header on-ink">
        <MediaThumb src={cover ? `${API_ORIGIN}${cover.url}` : null} poster={cover?.posterUrl ? `${API_ORIGIN}${cover.posterUrl}` : undefined} mediaType={cover?.mediaType} className="msj-hub-cover" />
        <div className="msj-hub-header-overlay" />
        <div className="wrap msj-hub-header-content">
          <div className="msj-hub-header-top">
            {cover && <MediaThumb src={`${API_ORIGIN}${cover.url}`} className="msj-hub-logo" />}
            <div>
              <span className="msj-card-title-row">
                <h1>{masjid.name}</h1>
                <GreenTickBadge masjid={masjid} variant="detail" />
              </span>
              <p className="msj-hub-header-meta">
                {[masjid.category, [masjid.city, masjid.country].filter(Boolean).join(", ")].filter(Boolean).join(" • ")}
              </p>
              {masjid.tagline && <p className="msj-profile-tagline">{masjid.tagline}</p>}
            </div>
          </div>

          {likeCount > 0 && (
            <div className="msj-hub-likes-row">
              <span className="msj-hub-likes-count"><Icon name="heart" size={15} /> {likeCount.toLocaleString()} {t("masjidProfile.peopleLikeThis", "people like this")}</span>
              <LikeAvatarStack topLikers={masjid.topLikers} likeCount={likeCount} onClick={() => setTab("people")} />
            </div>
          )}

          <div className="msj-hub-actions-row">
            <button type="button" className={`msj-hub-action-btn ${favorited ? "active" : ""}`} onClick={toggleFavorite} disabled={favBusy}>
              <Icon name="heart" size={16} /> {favorited ? t("masjidProfile.action.liked", "Liked") : t("masjidProfile.action.like", "Like")}
            </button>
            <button type="button" ref={shareBtnRef} className="msj-hub-action-btn" onClick={() => setShareOpen((v) => !v)}>
              <Icon name="link" size={16} /> {t("masjidProfile.action.share", "Share")}
            </button>
            <ShareMenu
              open={shareOpen}
              onClose={() => setShareOpen(false)}
              anchorRef={shareBtnRef}
              url={`${window.location.origin}/masjid/${masjid.slug || id}`}
              title={masjid.name}
            />
            {dirUrl ? (
              <a href={dirUrl} target="_blank" rel="noopener noreferrer" className="msj-hub-action-btn">
                <Icon name="compass" size={16} /> {t("masjidProfile.action.getDirections", "Get Directions")}
              </a>
            ) : (
              <span className="msj-hub-action-btn disabled"><Icon name="compass" size={16} /> {t("masjidProfile.action.getDirections", "Get Directions")}</span>
            )}
            {loggedIn ? (
              <button type="button" className="msj-hub-action-btn" onClick={() => setShowSuggest(true)}>
                <Icon name="edit" size={16} /> {t("masjidProfile.action.suggestCorrection", "Suggest a Correction")}
              </button>
            ) : (
              <Link to="/auth" className="msj-hub-action-btn"><Icon name="edit" size={16} /> {t("masjidProfile.action.suggestCorrection", "Suggest a Correction")}</Link>
            )}
            <button type="button" className="msj-hub-action-btn msj-hub-more-btn" title={t("masjidProfile.tabs.more", "More")}>⋯</button>
          </div>
        </div>
      </section>

      <div className="msj-hub-tabs-bar">
        <div className="wrap msj-hub-tabs">
          {TABS.map((tabDef) => (
            <button key={tabDef.key} type="button" className={tab === tabDef.key ? "active" : ""} onClick={() => setTab(tabDef.key)}>{tabDef.label}</button>
          ))}
        </div>
      </div>

      <section className="py-md msj-hub-content">
        <div className="wrap msj-hub-layout">
          <div className="msj-hub-left">
            <NearbyMasjidPanel activeId={id} onSelect={(newSlug) => navigate(`/masjid/${newSlug}/${tab}`)} />
          </div>
          <div className="msj-hub-main">
            {tab === "about" && (
              <>
                {masjid.about && (
                  <div className="msj-hub-about-text">
                    <h3>{t("masjidProfile.tabs.about", "About")}</h3>
                    <p>{masjid.about}</p>
                  </div>
                )}
                <div className="msj-hub-info-grid">
                  <InfoCard icon="mosque" label={t("masjidProfile.info.category", "Category")}>{masjid.category}</InfoCard>
                  <InfoCard icon="mapPin" label={t("masjidProfile.info.address", "Address")}>{address}</InfoCard>
                  <InfoCard icon="sun" label={t("masjidProfile.info.established", "Established")}>{masjid.yearEstablished}</InfoCard>
                  <InfoCard icon="people" label={t("masjidProfile.info.imam", "Imam")}>{masjid.imamName}</InfoCard>
                </div>
              </>
            )}
            {tab === "prayer-times" && <PrayerTimesTab masjidId={id} />}
            {tab === "community-wall" && <CommunityWallTab masjidId={id} masjidName={masjid.name} />}
            {tab === "people" && <PeopleWhoLikedTab masjidId={id} totalLikes={likeCount} />}
            {tab === "campaigns" && <ComingSoonPanel label={t("masjidProfile.tabs.campaigns", "Campaigns")} />}
            {tab === "media" && <MediaGallery photos={photos} />}
            {tab === "reviews" && <ReviewsTab masjidId={id} />}
            {tab === "location" && <ComingSoonPanel label={t("masjidProfile.tabs.location", "Location")} />}
            {tab === "more" && <ComingSoonPanel label={t("masjidProfile.tabs.more", "More")} />}
          </div>

          <aside className="msj-hub-side">
            <div className="card msj-hub-snapshot">
              <h3>{t("masjidProfile.snapshot.title", "Masjid Snapshot")}</h3>
              {masjid.category && <div className="msj-hub-snapshot-row"><span>{t("masjidProfile.info.category", "Category")}</span><strong>{masjid.category}</strong></div>}
              <div className="msj-hub-snapshot-row"><span>{t("masjidProfile.tabs.location", "Location")}</span><strong>{[masjid.city, masjid.country].filter(Boolean).join(", ") || "—"}</strong></div>
              <div className="msj-hub-snapshot-row"><span>{t("masjidProfile.snapshot.views", "Views")}</span><strong>{(masjid.viewCount || 0).toLocaleString()}</strong></div>
              <div className="msj-hub-snapshot-row"><span>{t("masjidProfile.snapshot.likes", "Likes")}</span><strong>{likeCount.toLocaleString()}</strong></div>
              <div className="msj-hub-snapshot-row">
                <span>{t("masjidProfile.snapshot.rating", "Rating")}</span>
                <strong className="msj-hub-snapshot-rating"><StarRating value={masjid.avgRating} size={13} /> {masjid.reviewCount > 0 ? masjid.avgRating.toFixed(1) : "—"}</strong>
              </div>
              <div className="msj-hub-snapshot-row"><span>{t("masjidProfile.tabs.campaigns", "Campaigns")}</span><strong>{masjid.campaignCount}</strong></div>
              <div className="msj-hub-snapshot-row"><span>{t("masjidProfile.snapshot.photosVideos", "Photos/Videos")}</span><strong>{masjid.photoCount} / {masjid.videoCount}</strong></div>
            </div>

            <div className="card msj-hub-snapshot">
              <h3>{t("masjidProfile.grow.title", "Grow the Community")}</h3>
              <div className="msj-hub-quick-actions">
                <Link to="/account/my-masjids/new"><Icon name="plus" size={15} /> {t("masjidProfile.grow.addMasjid", "Add a Masjid")}</Link>
                <Link to="/account/my-campaigns/new"><Icon name="plus" size={15} /> {t("masjidProfile.grow.addCampaign", "Add a Campaign")}</Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {showSuggest && (
        <div className="msj-modal-overlay" onClick={() => setShowSuggest(false)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setShowSuggest(false)} aria-label={t("masjidProfile.modal.close", "Close")}><Icon name="x" size={16} /></button>
            <h3 style={{ marginBottom: 16 }}>{t("masjidProfile.action.suggestCorrection", "Suggest a Correction")}</h3>
            {suggestSent ? (
              <p className="msj-suggest-edit-sent"><Icon name="check" size={15} /> {t("masjidProfile.modal.suggestSent", "Thanks! Your correction request has been sent for review.")}</p>
            ) : (
              <SuggestEditForm masjid={masjid} onDone={() => { setSuggestSent(true); }} onCancel={() => setShowSuggest(false)} />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default MasjidProfile;
