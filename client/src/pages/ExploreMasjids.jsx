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
import CategoryFilter from "./exploreMasjids/CategoryFilter.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const API = `${API_BASE}/masjids/public`;
const VIEW_KEYS = [
  { key: "grid", fallback: "Grid", icon: "grid" },
  { key: "list", fallback: "List", icon: "list" },
  { key: "map", fallback: "Map", icon: "map" },
];
const PAGE_SIZE = 12;

function ExploreMasjids() {
  const { t } = useTranslation();
  const VIEWS = VIEW_KEYS.map((v) => ({ ...v, label: t(`exploreMasjidsPage.view.${v.key}`, v.fallback) }));
  const [searchParams, setSearchParams] = useSearchParams();
  const view = VIEWS.some((v) => v.key === searchParams.get("view")) ? searchParams.get("view") : "grid";
  const q = searchParams.get("q") || "";
  const categoryParam = searchParams.get("category") || "";
  const selectedCategories = categoryParam ? categoryParam.split(",") : [];
  const likedOnly = searchParams.get("liked") === "true";

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
      .get(API, { params: { q, category: categoryParam, liked: likedOnly || undefined, page: 1, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setMasjids(data.masjids); setTotal(data.total); })
      .catch(() => setMasjids([]));
  }, [q, categoryParam, likedOnly]);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    axios
      .get(API, { params: { q, category: categoryParam, liked: likedOnly || undefined, page: nextPage, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setMasjids((prev) => [...(prev || []), ...data.masjids]); setPage(nextPage); })
      .finally(() => setLoadingMore(false));
  };

  // Map view: the complete filtered set (not one page), fetched only while Map is active.
  useEffect(() => {
    if (view !== "map") return;
    setMapMasjids(null);
    axios
      .get(`${API}/map`, { params: { q, category: categoryParam, liked: likedOnly || undefined } })
      .then(({ data }) => setMapMasjids(data.masjids))
      .catch(() => setMapMasjids([]));
  }, [view, q, categoryParam, likedOnly]);

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
    q && { key: "q", label: t('exploreMasjidsPage.filters.searchLabel', 'Search: "{q}"').replace("{q}", q) },
    ...selectedCategories.map((c) => ({ key: `category:${c}`, label: c, category: c })),
    likedOnly && { key: "liked", label: t("exploreMasjidsPage.filters.likedLabel", "♥ Liked") },
  ].filter(Boolean);

  const removeFilter = (f) => {
    if (f.key === "q") { setRawQ(""); setParam({ q: "" }); return; }
    if (f.key === "liked") { setParam({ liked: "" }); return; }
    if (f.category) {
      const next = selectedCategories.filter((c) => c !== f.category);
      setParam({ category: next.join(",") });
    }
  };

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
          <span className="eyebrow">{t("exploreMasjidsPage.hero.eyebrow", "Masjids")}</span>
          <h1>{t("exploreMasjidsPage.hero.title", "Verified masjids across the community")}</h1>
          <p>{t("exploreMasjidsPage.hero.intro", "Every masjid listed here has been reviewed and approved by our team — trusted, transparent, and part of the Masjid My Community network.")}</p>
        </div>
      </section>

      <section className="py-md msj-explore-content">
        <div className="wrap">
          <div className="msj-explore-filters">
            <div className="msj-search">
              <Icon name="search" size={16} />
              <input value={rawQ} onChange={(e) => setRawQ(e.target.value)} placeholder={t("exploreMasjidsPage.search.placeholder", "Search by name, location, or category…")} />
              <MicButton onTranscript={(text, isFinal) => { setRawQ(text); if (isFinal) setParam({ q: text }); }} />
            </div>
            <CategoryFilter
              categories={categories}
              selected={selectedCategories}
              onChange={(next) => setParam({ category: next.join(",") })}
            />
            <button
              type="button"
              className={`msj-liked-filter-toggle${likedOnly ? " active" : ""}`}
              aria-pressed={likedOnly}
              onClick={() => setParam({ liked: likedOnly ? "" : "true" })}
            >
              <Icon name="heart" size={15} /> {t("exploreMasjidsPage.filters.liked", "Liked")}
            </button>
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
                  <button type="button" onClick={() => removeFilter(f)}><Icon name="x" size={11} /></button>
                </span>
              ))}
              <button type="button" className="msj-clear-all" onClick={clearAll}>{t("exploreMasjidsPage.filters.clearAll", "Clear All Filters")}</button>
            </div>
          )}

          {hasNoResults && view !== "map" && (
            <div className="msj-empty-state">
              <Icon name="mosque" size={30} />
              <h3>{likedOnly ? t("exploreMasjidsPage.empty.likedTitle", "No liked masjids yet") : t("exploreMasjidsPage.empty.title", "No masjids found")}</h3>
              <p>
                {likedOnly
                  ? t("exploreMasjidsPage.empty.likedBody", "Tap the heart on a masjid card to keep track of it here.")
                  : t("exploreMasjidsPage.empty.body", "Try changing your search or removing some filters.")}
              </p>
              <button type="button" className="btn btn-gold" onClick={clearAll}>{t("exploreMasjidsPage.empty.clear", "Clear Filters")}</button>
            </div>
          )}

          {view === "grid" && hasResults && (
            <>
              <ExploreMasjidsGrid masjids={masjids} userLocation={coords} onOpenReviews={openReviews} />
              {masjids.length < total && (
                <div className="msj-load-more"><button type="button" className="btn btn-outline-ink" onClick={loadMore} disabled={loadingMore}>{loadingMore ? t("exploreMasjidsPage.loading", "Loading…") : t("exploreMasjidsPage.loadMore", "Load More")}</button></div>
              )}
            </>
          )}

          {view === "list" && hasResults && (
            <>
              <ExploreMasjidsList masjids={masjids} onViewOnMap={handleViewOnMap} userLocation={coords} onOpenReviews={openReviews} />
              {masjids.length < total && (
                <div className="msj-load-more"><button type="button" className="btn btn-outline-ink" onClick={loadMore} disabled={loadingMore}>{loadingMore ? t("exploreMasjidsPage.loading", "Loading…") : t("exploreMasjidsPage.loadMore", "Load More")}</button></div>
              )}
            </>
          )}

          {view === "map" && (
            mapMasjids == null
              ? <p className="msj-explore-map-loading">{t("exploreMasjidsPage.map.loading", "Loading map…")}</p>
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
