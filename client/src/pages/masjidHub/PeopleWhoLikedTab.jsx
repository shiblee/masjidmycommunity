import React, { useEffect, useState } from "react";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_ORIGIN } from "../../config.js";
import publicMasjidApi from "../../services/publicMasjidApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// Reuses the existing paginated /likers endpoint (already built for the
// avatar-stack preview) — this is just its first real full listing UI.
function PeopleWhoLikedTab({ masjidId }) {
  const { t } = useTranslation();
  const [likers, setLikers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = (p) => {
    const setBusy = p === 1 ? setLoading : setLoadingMore;
    setBusy(true);
    publicMasjidApi
      .get(`/${masjidId}/likers`, { params: { page: p } })
      .then(({ data }) => {
        setLikers((prev) => (p === 1 ? data.likers : [...prev, ...data.likers]));
        setTotal(data.total);
        setPage(p);
      })
      .catch(() => {
        if (p === 1) { setLikers([]); setTotal(0); }
      })
      .finally(() => setBusy(false));
  };

  useEffect(() => { load(1); }, [masjidId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="msj-hub-likers-panel">
      <h3>{t("engagement.peopleWhoLiked", "People Who Liked This Masjid")}{total > 0 ? ` (${total.toLocaleString()})` : ""}</h3>

      {loading ? (
        <p className="msj-review-empty">Loading…</p>
      ) : likers.length === 0 ? (
        <p className="msj-review-empty">No one has liked this masjid yet — be the first!</p>
      ) : (
        <>
          <div className="msj-hub-likers-list">
            {likers.map((u) => (
              <div className="msj-hub-liker-row" key={u.id}>
                <MediaThumb src={u.profilePhoto ? `${API_ORIGIN}${u.profilePhoto}` : null} className="msj-hub-liker-row-avatar" />
                <span>{u.fullName || u.username}</span>
              </div>
            ))}
          </div>
          {likers.length < total && (
            <button type="button" className="msj-nearby-load-more" onClick={() => load(page + 1)} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load More"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default PeopleWhoLikedTab;
