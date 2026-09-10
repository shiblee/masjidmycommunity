import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../services/userApi.js";
import { API_ORIGIN } from "../config.js";
import MediaThumb from "./MediaThumb.jsx";
import { Icon } from "./Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

function formatDistance(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

// The "pick a nearby masjid" list UI, shared by two callers: the site-wide
// PrimaryMasjidPrompt popup (which also offers Skip, tracked server-side)
// and the profile page's "Change Primary Masjid" button (which just closes
// on cancel — skipping doesn't apply once a masjid is already set). Pass
// `onSkip` to get the Skip button; omit it for a plain Cancel button.
function MasjidPickerModal({ title, subtitle, onSelected, onClose, onSkip }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [masjids, setMasjids] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
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
  }, []);

  const select = async (masjidId) => {
    setBusyId(masjidId);
    try {
      const { data } = await userApi.post("/me/primary-masjid", { masjidId });
      onSelected?.(data.primaryMasjid);
    } catch {
      setBusyId(null);
    }
  };

  const skip = async () => {
    setSkipping(true);
    try {
      await userApi.post("/me/primary-masjid/skip");
    } finally {
      onSkip ? onSkip() : onClose?.();
    }
  };

  return (
    <div className="msj-modal-overlay" onClick={skipping ? undefined : onClose}>
      <div className="msj-modal msj-modal-wide pmp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label={t("primaryMasjid.close", "Close")}>
          <Icon name="x" size={16} />
        </button>
        <h3>{title || t("primaryMasjid.title", "Select Your Primary Masjid")}</h3>
        <p className="msj-modal-sub">
          {subtitle || t("primaryMasjid.subtitle", "Choose the masjid closest to you, or the one you regularly visit, to set it as your Primary Masjid.")}
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
          {onSkip ? (
            <button type="button" className="btn btn-outline-ink" disabled={skipping} onClick={skip}>
              {skipping ? t("primaryMasjid.skipping", "Skipping…") : t("primaryMasjid.skip", "Skip for now")}
            </button>
          ) : (
            <button type="button" className="btn btn-outline-ink" onClick={onClose}>
              {t("primaryMasjid.cancel", "Cancel")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MasjidPickerModal;
