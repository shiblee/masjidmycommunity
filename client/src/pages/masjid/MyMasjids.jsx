import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import masjidApi from "../../services/masjidApi.js";
import MasjidDeleteFlow from "../../components/masjid/MasjidDeleteFlow.jsx";
import MyMasjidsGrid from "./MyMasjidsGrid.jsx";
import MyMasjidsList from "./MyMasjidsList.jsx";
import MyMasjidsMap from "./MyMasjidsMap.jsx";
import { buildStatusLabel, matchesSearch } from "./myMasjidsShared.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const VIEWS = [
  { key: "grid", icon: "grid" },
  { key: "list", icon: "list" },
  { key: "map", icon: "map" },
];

function MyMasjids() {
  const { t } = useTranslation();
  const STATUS_LABEL = buildStatusLabel(t);
  const VIEW_LABELS = {
    grid: t("exploreMasjidsPage.view.grid", "Grid"),
    list: t("exploreMasjidsPage.view.list", "List"),
    map: t("exploreMasjidsPage.view.map", "Map"),
  };
  const [masjids, setMasjids] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const view = VIEWS.some((v) => v.key === searchParams.get("view")) ? searchParams.get("view") : "grid";
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const status = searchParams.get("status") || "";

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const load = () => {
    masjidApi
      .get("/mine")
      .then(({ data }) => setMasjids(data.masjids))
      .catch(() => setError(t("communityWall.masjid.loadError", "Couldn't load your masjids.")));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    masjidApi.get("/public/categories").then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!masjids) return [];
    return masjids.filter((m) => matchesSearch(m, q) && (!category || m.category === category) && (!status || m.status === status));
  }, [masjids, q, category, status]);

  const stats = useMemo(() => {
    const list = masjids || [];
    return {
      total: list.length,
      approved: list.filter((m) => m.status === "approved").length,
      photos: list.reduce((sum, m) => sum + (m.photoCount || 0), 0),
      videos: list.reduce((sum, m) => sum + (m.videoCount || 0), 0),
    };
  }, [masjids]);

  const activeFilters = [
    q && { key: "q", label: t("myMasjids.filter.searchLabel", "Search: \"{query}\"").replace("{query}", q) },
    category && { key: "category", label: t("myMasjids.filter.categoryLabel", "Category: {category}").replace("{category}", category) },
    status && { key: "status", label: t("myMasjids.filter.statusLabel", "Status: {status}").replace("{status}", STATUS_LABEL[status]) },
  ].filter(Boolean);

  const clearAll = () => setSearchParams({}, { replace: true });

  const handleViewOnMap = (m) => {
    setSelectedId(m.id);
    setParam("view", "map");
  };

  const hasAnyMasjids = masjids && masjids.length > 0;
  const hasNoResults = hasAnyMasjids && filtered.length === 0;

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">{t("myMasjids.hero.eyebrow", "Your Masjids")}</span>
            <h1>{t("communityWall.masjid.myMasjidsHeading", "My Masjids")}</h1>
            <p>{t("myMasjids.hero.sub", "Register and manage the masjids you represent on Masjid My Community.")}</p>
          </div>
          <Link to="/account/my-masjids/new" className="btn btn-gold" style={{ marginLeft: "auto" }}>
            <Icon name="plus" size={16} /> {t("communityWall.masjid.registerHeading", "Register Your Masjid")}
          </Link>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {masjids && masjids.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="mosque" size={30} />
              <h3>{t("myMasjids.empty.title", "You haven't registered a masjid yet")}</h3>
              <p>{t("myMasjids.empty.body", "Register your masjid to start receiving verified visibility and, once approved, launch fundraising campaigns.")}</p>
              <Link to="/account/my-masjids/new" className="btn btn-gold">{t("communityWall.masjid.registerHeading", "Register Your Masjid")} <span className="btn-arrow">→</span></Link>
            </div>
          )}

          {hasAnyMasjids && (
            <>
              <div className="msj-stats-strip">
                <div className="msj-stat-box"><strong>{stats.total}</strong><span>{t("myMasjids.stats.total", "Total Masjids")}</span></div>
                <div className="msj-stat-box"><strong>{stats.approved}</strong><span>{t("masjidWizard.status.approved", "Approved")}</span></div>
                <div className="msj-stat-box"><strong>{stats.photos}</strong><span>{t("myMasjids.stats.photos", "Photos")}</span></div>
                <div className="msj-stat-box"><strong>{stats.videos}</strong><span>{t("myMasjids.stats.videos", "Videos")}</span></div>
              </div>

              <div className="msj-explore-filters">
                <div className="msj-search">
                  <Icon name="search" size={16} />
                  <input value={q} onChange={(e) => setParam("q", e.target.value)} placeholder={t("myMasjids.search.placeholder", "Search your masjids...")} />
                </div>
                <select value={category} onChange={(e) => setParam("category", e.target.value)}>
                  <option value="">{t("exploreMasjidsPage.categoryFilter.all", "All Categories")}</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <select value={status} onChange={(e) => setParam("status", e.target.value)}>
                  <option value="">{t("myMasjids.filter.allStatuses", "All Statuses")}</option>
                  {Object.entries(STATUS_LABEL).filter(([key]) => key !== "deleted").map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <div className="msj-view-switch">
                  {VIEWS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className={view === v.key ? "active" : ""}
                      onClick={() => setParam("view", v.key)}
                      title={VIEW_LABELS[v.key]}
                    >
                      <Icon name={v.icon} size={16} /> {VIEW_LABELS[v.key]}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilters.length > 0 && (
                <div className="msj-active-filters">
                  {activeFilters.map((f) => (
                    <span className="msj-active-filter-chip" key={f.key}>
                      {f.label}
                      <button type="button" onClick={() => setParam(f.key, "")}><Icon name="x" size={11} /></button>
                    </span>
                  ))}
                  <button type="button" className="msj-clear-all" onClick={clearAll}>{t("jobs.filter.clearAll", "Clear All Filters")}</button>
                </div>
              )}

              {hasNoResults && (
                <div className="msj-empty-state">
                  <Icon name="search" size={30} />
                  <h3>{t("myMasjids.noResults.title", "No masjids match your search")}</h3>
                  <p>{t("myMasjids.noResults.body", "Try a different search term or remove some filters.")}</p>
                  <button type="button" className="btn btn-gold" onClick={clearAll}>{t("exploreMasjidsPage.empty.clear", "Clear Filters")}</button>
                </div>
              )}

              {!hasNoResults && view === "grid" && <MyMasjidsGrid masjids={filtered} onDelete={setDeleteTarget} />}
              {!hasNoResults && view === "list" && <MyMasjidsList masjids={filtered} onDelete={setDeleteTarget} onViewOnMap={handleViewOnMap} />}
              {!hasNoResults && view === "map" && <MyMasjidsMap masjids={filtered} selectedId={selectedId} onSelect={setSelectedId} />}
            </>
          )}
        </div>
      </section>

      {deleteTarget && (
        <MasjidDeleteFlow masjid={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={load} />
      )}
    </main>
  );
}

export default MyMasjids;
