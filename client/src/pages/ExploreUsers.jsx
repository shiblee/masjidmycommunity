import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Icon } from "../components/Icons.jsx";
import MediaThumb from "../components/MediaThumb.jsx";
import { API_BASE, API_ORIGIN } from "../config.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const API = `${API_BASE}/users/public`;
const PAGE_SIZE = 24;

function memberSince(dateStr, t) {
  const year = new Date(dateStr).getFullYear();
  return t("exploreUsersPage.memberSince", "Member since {year}").replace("{year}", year);
}

function ExploreUsers() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const city = searchParams.get("city") || "";
  const sortBy = ["oldest", "newest", "random"].includes(searchParams.get("sortBy")) ? searchParams.get("sortBy") : "random";
  // Generated once per page visit and reused for every page/loadMore call
  // so "random" order stays stable while paging, instead of each request
  // reshuffling independently (see listDirectory's RAND(seed) comment).
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const [rawQ, setRawQ] = useState(q);
  const [rawCity, setRawCity] = useState(city);
  const debounceRef = useRef(null);

  const [users, setUsers] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const setParam = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (rawQ === q) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam({ q: rawQ }), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQ]);

  useEffect(() => {
    if (rawCity === city) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam({ city: rawCity }), 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawCity]);

  useEffect(() => {
    setPage(1);
    setUsers(null);
    axios
      .get(API, { params: { q, city, sortBy, seed, page: 1, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setUsers(data.users); setTotal(data.total); })
      .catch(() => setUsers([]));
  }, [q, city, sortBy, seed]);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    axios
      .get(API, { params: { q, city, sortBy, seed, page: nextPage, pageSize: PAGE_SIZE } })
      .then(({ data }) => { setUsers((prev) => [...(prev || []), ...data.users]); setPage(nextPage); })
      .finally(() => setLoadingMore(false));
  };

  const clearAll = () => { setRawQ(""); setRawCity(""); setSearchParams({}, { replace: true }); };

  const hasResults = users && users.length > 0;
  const hasNoResults = users && users.length === 0;

  return (
    <main className="msj-page">
      <section className="cw-hero msj-explore-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">{t("exploreUsersPage.hero.eyebrow", "Community")}</span>
          <h1>{t("exploreUsersPage.hero.title", "Registered members of our community")}</h1>
          <p>{t("exploreUsersPage.hero.intro", "Browse and connect with members of Masjid My Community.")}</p>
        </div>
      </section>

      <section className="py-md msj-explore-content">
        <div className="wrap">
          <div className="msj-explore-filters">
            <div className="msj-search">
              <Icon name="search" size={16} />
              <input value={rawQ} onChange={(e) => setRawQ(e.target.value)} placeholder={t("exploreUsersPage.search.placeholder", "Search by name…")} />
            </div>
            <div className="msj-search">
              <Icon name="mapPin" size={16} />
              <input value={rawCity} onChange={(e) => setRawCity(e.target.value)} placeholder={t("exploreUsersPage.search.cityPlaceholder", "Filter by city…")} />
            </div>
            <select value={sortBy} onChange={(e) => setParam({ sortBy: e.target.value })}>
              <option value="random">{t("exploreUsersPage.sort.random", "Random order")}</option>
              <option value="newest">{t("exploreUsersPage.sort.newest", "Newest members")}</option>
              <option value="oldest">{t("exploreUsersPage.sort.oldest", "Oldest members")}</option>
            </select>
          </div>

          {hasNoResults && (
            <div className="msj-empty-state">
              <Icon name="people" size={30} />
              <h3>{t("exploreUsersPage.empty.title", "No members found")}</h3>
              <p>{t("exploreUsersPage.empty.body", "Try changing your search or removing some filters.")}</p>
              <button type="button" className="btn btn-gold" onClick={clearAll}>{t("exploreMasjidsPage.empty.clear", "Clear Filters")}</button>
            </div>
          )}

          {hasResults && (
            <>
              <div className="msj-explore-grid">
                {users.map((u) => (
                  <Link to={`/profile/${u.username}`} className="msj-explore-card" key={u.id}>
                    <div className="msj-explore-thumb">
                      <MediaThumb src={u.profilePhoto ? `${API_ORIGIN}${u.profilePhoto}` : null} />
                    </div>
                    <div className="msj-explore-body">
                      <div className="msj-explore-card-top">
                        <span className="msj-card-title-row">
                          <h3>{u.fullName}</h3>
                          {u.verified && <Icon name="shieldCheck" size={16} />}
                        </span>
                      </div>
                      {(u.locationCity || u.locationCountry) && (
                        <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {[u.locationCity, u.locationCountry].filter(Boolean).join(", ")}</p>
                      )}
                      <p className="msj-list-loc">{memberSince(u.createdAt, t)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {users.length < total && (
                <div className="msj-load-more">
                  <button type="button" className="btn btn-outline-ink" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? t("exploreMasjidsPage.loading", "Loading…") : t("exploreMasjidsPage.loadMore", "Load More")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default ExploreUsers;
