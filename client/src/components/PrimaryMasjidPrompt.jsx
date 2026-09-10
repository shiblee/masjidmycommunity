import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../services/userApi.js";
import { getStoredUser } from "../utils/userAuthStorage.js";
import { API_ORIGIN } from "../config.js";
import MediaThumb from "./MediaThumb.jsx";
import { Icon } from "./Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

function formatDistance(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

// Site-wide, skippable-but-recurring encouragement to pick a "home" masjid —
// mounted once in App.jsx's MarketingLayout, same spot as CookieConsent.
// Unlike that banner, the skip is tracked server-side (User.primaryMasjidPromptSkippedAt),
// so the reminder interval is account-level, not per-browser: logging in on
// a different device still respects a recent skip.
function PrimaryMasjidPrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [masjids, setMasjids] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    if (!getStoredUser()) return;
    userApi
      .get("/me/primary-masjid-status")
      .then(({ data }) => {
        if (data.shouldPrompt) setOpen(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const loadNearby = (params) => {
      userApi
        .get("/me/nearby-masjids", { params })
        .then(({ data }) => setMasjids(data.masjids))
        .catch(() => setMasjids([]));
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadNearby({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => loadNearby(undefined),
        { timeout: 6000 }
      );
    } else {
      loadNearby(undefined);
    }
  }, [open]);

  const select = async (masjidId) => {
    setBusyId(masjidId);
    try {
      await userApi.post("/me/primary-masjid", { masjidId });
      setOpen(false);
    } catch {
      setBusyId(null);
    }
  };

  const skip = async () => {
    setSkipping(true);
    try {
      await userApi.post("/me/primary-masjid/skip");
    } finally {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="msj-modal-overlay" onClick={skipping ? undefined : skip}>
      <div className="msj-modal msj-modal-wide pmp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={skip} aria-label={t("primaryMasjid.close", "Close")}>
          <Icon name="x" size={16} />
        </button>
        <h3>{t("primaryMasjid.title", "Select Your Primary Masjid")}</h3>
        <p className="msj-modal-sub">
          {t("primaryMasjid.subtitle", "Choose the masjid closest to you, or the one you regularly visit, to set it as your Primary Masjid.")}
        </p>

        {masjids === null && <p className="msj-note">{t("primaryMasjid.loading", "Finding masjids near you…")}</p>}
        {masjids && masjids.length === 0 && (
          <p className="msj-note">{t("primaryMasjid.empty", "No masjids to show right now — you can pick one later from your profile.")}</p>
        )}

        {masjids && masjids.length > 0 && (
          <div className="pmp-list">
            {masjids.map((m) => (
              <div className="pmp-item" key={m.id}>
                <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} className="pmp-item-thumb" />
                <div className="pmp-item-body">
                  <strong>{m.name}</strong>
                  <span>{[m.city, m.country].filter(Boolean).join(", ")}</span>
                  {formatDistance(m.distanceKm) && <span className="pmp-item-distance">{formatDistance(m.distanceKm)}</span>}
                </div>
                <button type="button" className="btn btn-gold" disabled={busyId != null} onClick={() => select(m.id)}>
                  {busyId === m.id ? t("primaryMasjid.selecting", "Selecting…") : t("primaryMasjid.select", "Select")}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="pmp-actions">
          <button type="button" className="cmt-btn-text" onClick={() => navigate("/explore-masjids")}>
            {t("primaryMasjid.searchInstead", "Search for a masjid instead")}
          </button>
          <button type="button" className="btn btn-outline-ink" disabled={skipping} onClick={skip}>
            {skipping ? t("primaryMasjid.skipping", "Skipping…") : t("primaryMasjid.skip", "Skip for now")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrimaryMasjidPrompt;
