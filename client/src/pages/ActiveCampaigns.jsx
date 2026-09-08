import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config.js";
import { Icon } from "../components/Icons.jsx";
import MediaThumb from "../components/MediaThumb.jsx";
import MicButton from "../components/MicButton.jsx";
import { toCardShape } from "../utils/campaignCardShape.js";

const SAVED_KEY = "mmc-saved-campaigns";
const PAGE_SIZE = 12;

function ProgressBar({ pct }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="progress-track" ref={ref}>
      <div className="progress-fill" style={{ width: inView ? `${pct}%` : "0%" }} />
    </div>
  );
}

function ActiveCampaigns() {
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState("All"); // "All" | "__saved__" | category id (string)
  const [q, setQ] = useState("");
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });

  const toggleSaved = (id) => {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    axios.get(`${API_BASE}/campaigns/public/categories`).then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  // Search is debounced; category/saved switches and page changes fetch
  // immediately. Switching filter or search resets to page 1 and replaces
  // the list rather than appending.
  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      const categoryId = filter !== "All" && filter !== "__saved__" ? filter : undefined;
      axios
        .get(`${API_BASE}/campaigns/public`, { params: { q: q || undefined, categoryId, page, pageSize: PAGE_SIZE } })
        .then(({ data }) => {
          setCampaigns((prev) => (page === 1 ? data.campaigns.map(toCardShape) : [...prev, ...data.campaigns.map(toCardShape)]));
          setTotal(data.total);
        })
        .catch(() => { if (page === 1) setCampaigns([]); })
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filter, page]);

  const changeFilter = (next) => {
    setFilter(next);
    setPage(1);
  };

  const visible = filter === "__saved__" ? campaigns.filter((c) => saved.has(c.id)) : campaigns;
  const canLoadMore = filter !== "__saved__" && campaigns.length < total;

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow">Active Campaigns</span>
          <h1>Every project raising funds right now.</h1>
          <p>Browse live campaigns from verified masjids — search by name, filter by category, and follow the ones you care about.</p>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="campaign-filters reveal">
            <button className={`filter-chip${filter === "All" ? " active" : ""}`} onClick={() => changeFilter("All")}>All</button>
            {categories.map((cat) => (
              <button key={cat.id} className={`filter-chip${filter === String(cat.id) ? " active" : ""}`} onClick={() => changeFilter(String(cat.id))}>
                {cat.name}
              </button>
            ))}
            <button className={`filter-chip saved-chip${filter === "__saved__" ? " active" : ""}`} onClick={() => changeFilter("__saved__")}>
              ♥ Saved{saved.size > 0 ? ` (${saved.size})` : ""}
            </button>
          </div>

          <div className="msj-search" style={{ maxWidth: 420, margin: "18px 0" }}>
            <Icon name="search" size={16} />
            <input type="text" placeholder="Search campaigns…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <MicButton onTranscript={(text) => { setQ(text); setPage(1); }} />
          </div>

          <div className="filter-count">
            {loading && page === 1 ? "Loading campaigns…" : filter === "__saved__" ? `${visible.length} saved campaign${visible.length === 1 ? "" : "s"}` : `Showing ${campaigns.length} of ${total} campaigns`}
          </div>

          {!loading && visible.length === 0 ? (
            <div className="campaign-empty">
              <p>
                {filter === "__saved__"
                  ? "No saved campaigns yet — tap the heart on a card to keep track of one."
                  : q
                  ? `No campaigns match "${q}" right now.`
                  : "No live campaigns right now — check back soon."}
              </p>
              {filter !== "All" && (
                <button className="btn btn-outline-ink" style={{ marginTop: "16px" }} onClick={() => { changeFilter("All"); setQ(""); }}>
                  Browse All Campaigns
                </button>
              )}
            </div>
          ) : (
            <div className="campaign-grid" style={{ marginTop: "12px" }}>
              {visible.map((c, i) => {
                const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
                const isSaved = saved.has(c.id);
                const urgent = c.days > 0 && c.days <= 14;
                return (
                  <Link to={`/campaign/${c.slug}`} className="campaign-card" style={{ animationDelay: `${(i % PAGE_SIZE) * 0.06}s` }} key={c.id}>
                    <div className="campaign-img">
                      <MediaThumb src={c.img || null} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <span className="campaign-badge">✓ {c.badge}</span>
                      <span className="campaign-cat">{c.cat}</span>
                      <button
                        className={`campaign-save${isSaved ? " active" : ""}`}
                        aria-label={isSaved ? "Remove from saved campaigns" : "Save campaign"}
                        aria-pressed={isSaved}
                        onClick={(e) => { e.preventDefault(); toggleSaved(c.id); }}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.8 4 5.2c2-1.2 4.4-.6 5.7 1 .7.8 1.4 1.8 2.3 1.8s1.6-1 2.3-1.8c1.3-1.6 3.7-2.2 5.7-1 2.6 1.6 3.2 4.9 1.3 7.7C18.7 16.65 12 21 12 21z" />
                        </svg>
                      </button>
                    </div>
                    <div className="campaign-body">
                      <div className="campaign-loc">{c.name} · {c.loc}</div>
                      <div className="campaign-title">{c.title}</div>
                      <ProgressBar pct={pct} />
                      <div className="campaign-meta">
                        <span className="raised">₹{c.raised.toLocaleString("en-IN")} raised</span>
                        <span className="goal">of ₹{c.goal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="campaign-foot">
                        <span>{c.supporters} supporters</span>
                        <span className={urgent ? "urgent" : ""}>
                          {c.days > 0 ? `${c.days} days left` : "Fully funded"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {canLoadMore && (
            <div style={{ textAlign: "center", marginTop: "36px" }}>
              <button className="btn btn-outline-ink" disabled={loading} onClick={() => setPage((p) => p + 1)}>
                {loading ? "Loading…" : "Load More Campaigns"}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ActiveCampaigns;
