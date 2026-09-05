import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { Icon } from "../components/Icons.jsx";
import MicButton from "../components/MicButton.jsx";
import { API_BASE } from "../config.js";
import ExploreMasjidsGrid from "./exploreMasjids/ExploreMasjidsGrid.jsx";
import ExploreMasjidsList from "./exploreMasjids/ExploreMasjidsList.jsx";
import ExploreMasjidsMap from "./exploreMasjids/ExploreMasjidsMap.jsx";
import MasjidReviewModal from "./exploreMasjids/MasjidReviewModal.jsx";

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

  const [rawQ, setRawQ] = useState(q);
  const debounceRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [coords, setCoords] = useState(null);

  const [masjids, setMasjids] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [mapMasjids, setMapMasjids] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);

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
    axios.get(`${API}/categories`).then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  // Grid/List: paginated fetch, reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
    setMasjids(null);
    axios
      .get(API, { params: { q, category, page: 1, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setMasjids(data.masjids); setTotal(data.total); })
      .catch(() => setMasjids([]));
  }, [q, category]);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    axios
      .get(API, { params: { q, category, page: nextPage, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setMasjids((prev) => [...(prev || []), ...data.masjids]); setPage(nextPage); })
      .finally(() => setLoadingMore(false));
  };

  // Map view: the complete filtered set (not one page), fetched only while Map is active.
  useEffect(() => {
    if (view !== "map") return;
    setMapMasjids(null);
    axios
      .get(`${API}/map`, { params: { q, category } })
      .then(({ data }) => setMapMasjids(data.masjids))
      .catch(() => setMapMasjids([]));
  }, [view, q, category]);

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
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
  ].filter(Boolean);

  const clearAll = () => { setRawQ(""); setSearchParams({}, { replace: true }); };

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
