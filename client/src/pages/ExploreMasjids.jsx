import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Icon } from "../components/Icons.jsx";
import MicButton from "../components/MicButton.jsx";
import { API_BASE } from "../config.js";
import ExploreMasjidsGrid from "./exploreMasjids/ExploreMasjidsGrid.jsx";
import ExploreMasjidsList from "./exploreMasjids/ExploreMasjidsList.jsx";
import ExploreMasjidsMap from "./exploreMasjids/ExploreMasjidsMap.jsx";
import MasjidReviewModal from "./exploreMasjids/MasjidReviewModal.jsx";
import { distanceKm, NEARBY_RADIUS_KM } from "./exploreMasjids/exploreMasjidsShared.jsx";

const API = `${API_BASE}/masjids/public`;
const VIEWS = [
  { key: "grid", label: "Grid", icon: "grid" },
  { key: "list", label: "List", icon: "list" },
  { key: "map", label: "Map", icon: "map" },
];
const PAGE_SIZE = 12;

function ExploreMasjids() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = VIEWS.some((v) => v.key === searchParams.get("view")) ? searchParams.get("view") : "grid";
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const city = searchParams.get("city") || "";
  const country = searchParams.get("country") || "";
  const activeOnly = searchParams.get("activeOnly") === "1";
  const nearbyOnly = searchParams.get("nearbyOnly") === "1";

  const [rawQ, setRawQ] = useState(q);
  const debounceRef = useRef(null);

  const [filters, setFilters] = useState({ cities: [], countries: [] });
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [coords, setCoords] = useState(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(null);

  const [masjids, setMasjids] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [mapMasjids, setMapMasjids] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const cityRef = useRef(null);

  const openReviews = (m, initialTab = "overview") => setReviewModal({ masjid: m, initialTab });

  const setParam = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  // Debounce the raw input into the URL's `q` — a real network request fires per change.
  useEffect(() => {
    if (rawQ === q) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam({ q: rawQ }), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQ]);

  useEffect(() => {
    axios.get(`${API}/filters`).then(({ data }) => setFilters(data)).catch(() => {});
    axios.get(`${API}/categories`).then(({ data }) => setCategories(data.categories)).catch(() => {});
    axios.get(`${API}/stats`).then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  // nearbyOnly needs a known location to mean anything server-side — until then it's ignored.
  const nearbyParams = nearbyOnly && coords ? { lat: coords.lat, lng: coords.lng } : {};

  // Grid/List: paginated fetch, reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
    setMasjids(null);
    axios
      .get(API, { params: { q, city, country, category, activeOnly: activeOnly ? 1 : undefined, ...nearbyParams, page: 1, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setMasjids(data.masjids); setTotal(data.total); })
      .catch(() => setMasjids([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, country, category, activeOnly, nearbyOnly, coords]);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    axios
      .get(API, { params: { q, city, country, category, activeOnly: activeOnly ? 1 : undefined, ...nearbyParams, page: nextPage, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setMasjids((prev) => [...(prev || []), ...data.masjids]); setPage(nextPage); })
      .finally(() => setLoadingMore(false));
  };

  // Map view: the complete filtered set (not one page), fetched only while Map is active.
  useEffect(() => {
    if (view !== "map") return;
    setMapMasjids(null);
    axios
      .get(`${API}/map`, { params: { q, city, country, category, activeOnly: activeOnly ? 1 : undefined, ...nearbyParams } })
      .then(({ data }) => setMapMasjids(data.masjids))
      .catch(() => setMapMasjids([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, q, city, country, category, activeOnly, nearbyOnly, coords]);

  // Nearby count reflects the whole directory (like Total/Cities/Active), not the active filters.
  useEffect(() => {
    if (!coords) return;
    axios.get(`${API}/map`).then(({ data }) => {
      const nearby = (data.masjids || []).filter(
        (m) => m.latitude != null && m.longitude != null && distanceKm(coords.lat, coords.lng, Number(m.latitude), Number(m.longitude)) <= NEARBY_RADIUS_KM
      );
      setNearbyCount(nearby.length);
    });
  }, [coords]);

  const requestLocation = () => {
    if (!navigator.geolocation) { setGeoDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoDenied(true)
    );
  };

  // Distance-to-masjid shows up in Grid/List/Map alike, so location is asked for
  // once on load rather than per-view — a denial is remembered so it won't nag again.
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeFilters = [
    q && { key: "q", label: `Search: "${q}"` },
    category && { key: "category", label: `Category: ${category}` },
    city && { key: "city", label: `City: ${city}` },
    country && { key: "country", label: `Country: ${country}` },
    activeOnly && { key: "activeOnly", label: "Has an active campaign" },
    nearbyOnly && coords && { key: "nearbyOnly", label: `Within ${NEARBY_RADIUS_KM}km of you` },
  ].filter(Boolean);

  const clearAll = () => { setRawQ(""); setSearchParams({}, { replace: true }); };

  const handleTotalClick = () => clearAll();
  const handleCitiesClick = () => cityRef.current?.focus();
  const handleActiveCampaignsClick = () => setParam({ activeOnly: activeOnly ? "" : "1" });
  const handleNearbyClick = () => {
    if (!coords) { requestLocation(); return; }
    setParam({ nearbyOnly: nearbyOnly ? "" : "1" });
  };

  const handleViewOnMap = (m) => {
    setSelectedId(m.id);
    setParam({ view: "map" });
  };

  const hasResults = masjids && masjids.length > 0;
  const hasNoResults = masjids && masjids.length === 0;

  return (
    <main className="msj-page">
      <section className="cw-hero msj-explore-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">Explore Masjids</span>
          <h1>Verified masjids across the community</h1>
          <p>Every masjid listed here has been reviewed and approved by our team — trusted, transparent, and part of the Masjid My Community network.</p>
        </div>
      </section>

      <section className="py-md msj-explore-content">
        <div className="wrap">
          {stats && (
            <div className="msj-stats-strip">
              <button type="button" className="msj-stat-box msj-stat-clickable" onClick={handleTotalClick} title="Clear all filters">
                <strong>{stats.totalMasjids}</strong><span>Total Masjids</span>
              </button>
              <button type="button" className="msj-stat-box msj-stat-clickable" onClick={handleCitiesClick} title="Choose a city">
                <strong>{stats.citiesCovered}</strong><span>Cities Covered</span>
              </button>
              <button
                type="button"
                className={`msj-stat-box msj-stat-clickable ${activeOnly ? "active" : ""}`}
                onClick={handleActiveCampaignsClick}
                title={activeOnly ? "Showing masjids with an active campaign — click to clear" : "Show only masjids with an active campaign"}
              >
                <strong>{stats.activeCampaigns}</strong><span>Active Campaigns</span>
              </button>
              <div className={`msj-stat-box msj-stat-nearby ${nearbyOnly && coords ? "active" : ""}`}>
                {nearbyCount != null ? (
                  <button type="button" className="msj-stat-clickable" onClick={handleNearbyClick} title={nearbyOnly ? "Showing only nearby masjids — click to clear" : "Show only masjids near you"}>
                    <strong>{nearbyCount}</strong><span>Nearby You ({NEARBY_RADIUS_KM}km)</span>
                  </button>
                ) : geoDenied ? (
                  <span className="msj-stat-nearby-hint">Location unavailable</span>
                ) : (
                  <button type="button" className="msj-stat-nearby-btn" onClick={requestLocation}>
                    <Icon name="mapPin" size={14} /> Find Nearby
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="msj-explore-filters">
            <div className="msj-search">
              <Icon name="search" size={16} />
              <input value={rawQ} onChange={(e) => setRawQ(e.target.value)} placeholder="Search by name, location, or category…" />
              <MicButton onTranscript={(text, isFinal) => { setRawQ(text); if (isFinal) setParam({ q: text }); }} />
            </div>
            <select value={category} onChange={(e) => setParam({ category: e.target.value })}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name} ({c.count})</option>)}
            </select>
            <select ref={cityRef} value={city} onChange={(e) => setParam({ city: e.target.value })}>
              <option value="">All Cities</option>
              {filters.cities.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
            </select>
            <select value={country} onChange={(e) => setParam({ country: e.target.value })}>
              <option value="">All Countries</option>
              {filters.countries.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
            </select>
            <div className="msj-view-switch">
              {VIEWS.map((v) => (
                <button key={v.key} type="button" className={view === v.key ? "active" : ""} onClick={() => setParam({ view: v.key })} title={v.label}>
                  <Icon name={v.icon} size={16} /> {v.label}
                </button>
              ))}
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="msj-active-filters">
              {activeFilters.map((f) => (
                <span className="msj-active-filter-chip" key={f.key}>
                  {f.label}
                  <button type="button" onClick={() => { if (f.key === "q") setRawQ(""); setParam({ [f.key]: "" }); }}><Icon name="x" size={11} /></button>
                </span>
              ))}
              <button type="button" className="msj-clear-all" onClick={clearAll}>Clear All Filters</button>
            </div>
          )}

          {hasNoResults && view !== "map" && (
            <div className="msj-empty-state">
              <Icon name="mosque" size={30} />
              <h3>No masjids found</h3>
              <p>Try changing your search or removing some filters.</p>
              <button type="button" className="btn btn-gold" onClick={clearAll}>Clear Filters</button>
            </div>
          )}

          {view === "grid" && hasResults && (
            <>
              <ExploreMasjidsGrid masjids={masjids} userLocation={coords} onOpenReviews={openReviews} />
              {masjids.length < total && (
                <div className="msj-load-more"><button type="button" className="btn btn-outline-ink" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load More"}</button></div>
              )}
            </>
          )}

          {view === "list" && hasResults && (
            <>
              <ExploreMasjidsList masjids={masjids} onViewOnMap={handleViewOnMap} userLocation={coords} onOpenReviews={openReviews} />
              {masjids.length < total && (
                <div className="msj-load-more"><button type="button" className="btn btn-outline-ink" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load More"}</button></div>
              )}
            </>
          )}

          {view === "map" && (
            mapMasjids == null
              ? <p className="msj-explore-map-loading">Loading map…</p>
              : <ExploreMasjidsMap masjids={mapMasjids} selectedId={selectedId} onSelect={setSelectedId} userLocation={coords} onLocateMe={requestLocation} onOpenReviews={openReviews} />
          )}
        </div>
      </section>

      {reviewModal && (
        <MasjidReviewModal masjid={reviewModal.masjid} initialTab={reviewModal.initialTab} onClose={() => setReviewModal(null)} />
      )}
    </main>
  );
}

export default ExploreMasjids;
