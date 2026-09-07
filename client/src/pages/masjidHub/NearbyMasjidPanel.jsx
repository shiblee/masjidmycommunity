import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import MicButton from "../../components/MicButton.jsx";
import { API_BASE, API_ORIGIN } from "../../config.js";
import EngagementRow from "../../components/masjid/EngagementRow.jsx";
import GreenTickBadge from "../../components/masjid/GreenTickBadge.jsx";

const API = `${API_BASE}/masjids/public`;
const PAGE_SIZE = 20;

function formatDistanceKm(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Left-side discovery panel: every masjid, nearest-to-the-one-being-viewed
 * first, with the current masjid highlighted. Re-fetches (from page 1)
 * whenever `activeId` changes, since "nearest first" is relative to
 * whichever masjid is currently open. */
function NearbyMasjidPanel({ activeId, onSelect }) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [masjids, setMasjids] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(rawQuery), 300);
    return () => clearTimeout(debounceRef.current);
  }, [rawQuery]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    axios
      .get(`${API}/${activeId}/nearby-list`, { params: { q: query, page: 1, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setMasjids(data.masjids); setTotal(data.total); })
      .catch(() => setMasjids([]))
      .finally(() => setLoading(false));
  }, [activeId, query]);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    axios
      .get(`${API}/${activeId}/nearby-list`, { params: { q: query, page: nextPage, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setMasjids((prev) => [...prev, ...data.masjids]); setPage(nextPage); })
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="msj-nearby-panel">
      <div className="msj-nearby-search">
        <Icon name="search" size={14} />
        <input value={rawQuery} onChange={(e) => setRawQuery(e.target.value)} placeholder="Search masjids…" />
        <MicButton onTranscript={(text, isFinal) => { setRawQuery(text); if (isFinal) setQuery(text); }} />
      </div>

      <div className="msj-nearby-list">
        {loading && <p className="msj-nearby-empty">Loading…</p>}
        {!loading && masjids.length === 0 && <p className="msj-nearby-empty">No masjids found.</p>}
        {!loading && masjids.map((m) => (
          <button
            type="button"
            key={m.id}
            className={`msj-nearby-item ${m.id === Number(activeId) ? "active" : ""}`}
            onClick={() => onSelect(m.slug || m.id)}
          >
            <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} className="msj-nearby-thumb" />
            <span className="msj-nearby-item-body">
              <span className="msj-card-title-row">
                <strong>{m.name}</strong>
                <GreenTickBadge masjid={m} variant="map" />
              </span>
              <span className="msj-nearby-item-meta">
                {[m.category, [m.city, m.country].filter(Boolean).join(", ")].filter(Boolean).join(" • ")}
              </span>
              <EngagementRow masjid={m} variant="map" className="msj-nearby-item-engagement" />
            </span>
            {formatDistanceKm(m.distanceKm) && <span className="msj-nearby-distance">{formatDistanceKm(m.distanceKm)}</span>}
          </button>
        ))}
      </div>

      {!loading && masjids.length < total && (
        <button type="button" className="msj-nearby-load-more" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? "Loading…" : "Load More"}
        </button>
      )}
    </div>
  );
}

export default NearbyMasjidPanel;
