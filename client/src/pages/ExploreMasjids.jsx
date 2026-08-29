import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import MediaThumb from "../components/MediaThumb.jsx";
import axios from "axios";
import { API_BASE, API_ORIGIN } from "../config.js";

const API = `${API_BASE}/masjids/public`;

function ExploreMasjids() {
  const [masjids, setMasjids] = useState(null);
  const [filters, setFilters] = useState({ cities: [], countries: [] });
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    axios.get(`${API}/filters`).then(({ data }) => setFilters(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (q) params.q = q;
    if (city) params.city = city;
    if (country) params.country = country;
    axios.get(API, { params }).then(({ data }) => setMasjids(data.masjids)).catch(() => setMasjids([]));
  }, [q, city, country]);

  return (
    <main className="msj-page">
      <section className="cw-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">Explore Masjids</span>
          <h1 style={{ fontSize: "clamp(30px,4vw,48px)", marginTop: 12 }}>Verified masjids across the community</h1>
          <p style={{ maxWidth: 560, marginTop: 14, color: "var(--text-on-ink-dim)" }}>
            Every masjid listed here has been reviewed and approved by our team — trusted, transparent, and part of the Masjid My Community network.
          </p>
        </div>
      </section>

      <section className="py-md">
        <div className="wrap">
          <div className="msj-explore-filters">
            <div className="msj-search">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by masjid name, city, or country" />
            </div>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All Cities</option>
              {filters.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All Countries</option>
              {filters.countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {masjids && masjids.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="mosque" size={30} />
              <h3>No masjids match your search</h3>
              <p>Try a different city, country, or search term.</p>
            </div>
          )}

          <div className="msj-explore-grid">
            {masjids?.map((m) => (
              <Link to={`/masjid/${m.id}`} className="msj-explore-card" key={m.id}>
                <div className="msj-explore-thumb">
                  <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
                  <span className="msj-verified-badge"><Icon name="shieldCheck" size={13} /> Verified</span>
                </div>
                <div className="msj-explore-body">
                  <h3>{m.name}</h3>
                  {m.tagline && <p className="msj-explore-tagline">{m.tagline}</p>}
                  <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {[m.city, m.country].filter(Boolean).join(", ")}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default ExploreMasjids;
