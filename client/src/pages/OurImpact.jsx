import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icons.jsx";
import Flow from "../components/Flow.jsx";

const heroStats = [
  { n: "46", label: "Countries Reached" },
  { n: "1,284", label: "Masjids Empowered" },
  { n: "980+", label: "Communities Supported" },
  { n: "₹4.82M+", label: "Total Funds Raised" },
];

const globalStats = [
  { icon: "globe", n: 46, suffix: "", label: "Countries Reached" },
  { icon: "mosque", n: 1284, suffix: "", label: "Masjids Empowered" },
  { icon: "people", n: 980, suffix: "+", label: "Communities Supported" },
  { icon: "chartUp", n: 4820000, prefix: "₹", suffix: "+", label: "Total Funds Raised" },
  { icon: "flag", n: 312, suffix: "", label: "Active Projects" },
  { icon: "heart", n: 2100000, suffix: "+", label: "People Impacted" },
];

const regions = [
  { flag: "🇮🇳", name: "Uttar Pradesh", masjids: 172, raised: "₹6.8L+", raisedNum: 680000 },
  { flag: "🇮🇳", name: "Kerala", masjids: 154, raised: "₹5.9L+", raisedNum: 590000 },
  { flag: "🇮🇳", name: "West Bengal", masjids: 138, raised: "₹5.1L+", raisedNum: 510000 },
  { flag: "🇮🇳", name: "Maharashtra", masjids: 121, raised: "₹4.3L+", raisedNum: 430000 },
  { flag: "🇮🇳", name: "Bihar", masjids: 108, raised: "₹3.6L+", raisedNum: 360000 },
  { flag: "🇮🇳", name: "Tamil Nadu", masjids: 89, raised: "₹2.4L+", raisedNum: 240000 },
];
const maxRegionRaised = Math.max(...regions.map((r) => r.raisedNum));

const categories = [
  { icon: "mosque", title: "Masjid Development", desc: "Construction, renovation, maintenance and infrastructure that gives every congregation a safe, dignified space to gather.", stat: "412", statLabel: "projects funded" },
  { icon: "book", title: "Education", desc: "Learning spaces, Islamic education, libraries and digital learning that build knowledge across generations.", stat: "96", statLabel: "education programs" },
  { icon: "sun", title: "Sustainable Energy", desc: "Solar power and sustainable infrastructure that lower costs and put more of every donation toward the community.", stat: "58", statLabel: "masjids switched to solar" },
  { icon: "drop", title: "Water & Sanitation", desc: "Clean water access and essential sanitation facilities for daily life and worship.", stat: "73", statLabel: "water projects completed" },
  { icon: "monitor", title: "Digital Empowerment", desc: "Technology, connectivity and digital systems that help masjids operate and communicate like modern institutions.", stat: "180+", statLabel: "masjid websites live" },
  { icon: "heart", title: "Community Welfare", desc: "Programs that support families, youth and elderly members with food, shelter and social care.", stat: "640K+", statLabel: "people supported" },
];

const stories = [
  {
    name: "Masjid Al-Ihsan",
    loc: "Dakar, Senegal",
    cat: "Clean Water",
    objective: "A working well before it could hold consistent prayers.",
    text: "In ten weeks, 640 donors across 22 countries funded a full well and sanitation system — daily life, and daily prayer, changed together.",
    raised: 8400,
    goal: 8400,
    img: "https://images.unsplash.com/photo-1705923620684-683a7473b504?auto=format&fit=crop&w=800&q=75",
  },
  {
    name: "Baitul Ilm",
    loc: "Birmingham, UK",
    cat: "Education",
    objective: "A learning center for 300 students.",
    text: "What began as a single classroom request grew into a full learning center, funded largely by families who once studied at the same masjid.",
    raised: 21000,
    goal: 21000,
    img: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=800&q=75",
  },
  {
    name: "Sultan Ahmed Center",
    loc: "Istanbul, Türkiye",
    cat: "Renovation",
    objective: "Restoring a historic masjid's structure.",
    text: "890 supporters helped renovate a century-old masjid, preserving its architecture while modernizing its facilities for a growing congregation.",
    raised: 41200,
    goal: 60000,
    img: "https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=800&q=75",
  },
];

const transparencyFlow = [
  { icon: "heart", label: "Donation" },
  { icon: "chartUp", label: "Fund Collection" },
  { icon: "mosque", label: "Project" },
  { icon: "monitor", label: "Progress Updates" },
  { icon: "people", label: "Community Impact" },
];

function currency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function useCountUp(target, ref, prefix = "", suffix = "") {
  const [text, setText] = useState("0");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dur = 1500;
            const start = performance.now();
            function tick(now) {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              setText(prefix + Math.round(target * eased).toLocaleString("en-US") + suffix);
              if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, prefix, suffix, ref]);
  return text;
}

function StatTile({ s, i }) {
  const ref = useRef(null);
  const text = useCountUp(s.n, ref, s.prefix || "", s.suffix || "");
  return (
    <div className="oi-stat-tile" ref={ref} style={{ transitionDelay: `${i * 0.06}s` }}>
      <div className="oi-stat-icon">
        <Icon name={s.icon} size={22} />
      </div>
      <strong className="mono">{text}</strong>
      <span>{s.label}</span>
    </div>
  );
}

function OurImpact() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 100px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <main className="oi-page">
      <section className="oi-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">Our Impact</span>
          <h1>One Masjid Can Strengthen an Entire Community.</h1>
          <p>
            Empowering masjids. Creating impact beyond boundaries. Every campaign on Masjid My Community represents
            real people, real needs, and a real community working together — here's what that looks like at scale.
          </p>
          <div className="cw-hero-stats">
            {heroStats.map((s) => (
              <div key={s.label}>
                <strong>{s.n}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Reach across India</span>
            <h2>Impact that spans states</h2>
            <p>A snapshot of where Masjid My Community is active today — growing every week.</p>
          </div>
          <div className="oi-stat-grid reveal">
            {globalStats.map((s, i) => (
              <StatTile s={s} i={i} key={s.label} />
            ))}
          </div>

          <div className="oi-regions-label reveal">
            <span>Top regions</span>
            <span className="oi-regions-label-raised">Funds raised</span>
          </div>
          <div className="oi-region-grid">
            {regions.map((r, i) => {
              const pct = Math.round((r.raisedNum / maxRegionRaised) * 100);
              return (
                <div className="oi-region-card reveal" style={{ transitionDelay: `${i * 0.07}s` }} key={r.name}>
                  <div className="oi-region-top">
                    <span className="oi-region-rank mono">{String(i + 1).padStart(2, "0")}</span>
                    <span className="oi-region-flag">{r.flag}</span>
                    <span className="oi-region-name">{r.name}</span>
                  </div>
                  <div className="oi-region-bar-track">
                    <div className="oi-region-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="oi-region-bottom">
                    <span className="oi-region-raised mono">{r.raised}</span>
                    <span className="oi-region-sub">{r.masjids} masjids</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py cat-strip">
        <div className="wrap">
          <div className="section-head on-ink reveal">
            <span className="eyebrow">Where the impact happens</span>
            <h2>Six areas of empowerment</h2>
          </div>
          <div className="oi-impact-grid reveal">
            {categories.map((c, i) => (
              <div className="oi-impact-card" style={{ transitionDelay: `${i * 0.07}s` }} key={c.title}>
                <span className="oi-impact-ghost" aria-hidden="true">
                  <Icon name={c.icon} size={132} />
                </span>
                <div className="oi-impact-icon">
                  <Icon name={c.icon} size={26} />
                </div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <div className="oi-impact-stat">
                  <strong className="mono">{c.stat}</strong>
                  <span>{c.statLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Stories of impact</span>
            <h2>Real masjids, real progress</h2>
          </div>
          <div className="oi-story-grid">
            {stories.map((s, i) => {
              const pct = Math.min(100, Math.round((s.raised / s.goal) * 100));
              return (
                <div className="oi-story-card reveal" style={{ transitionDelay: `${i * 0.08}s` }} key={s.name}>
                  <div className="oi-story-img">
                    <img src={s.img} alt={s.name} loading="lazy" />
                    <span className="oi-story-cat">{s.cat}</span>
                  </div>
                  <div className="oi-story-body">
                    <div className="oi-story-loc">{s.name} · {s.loc}</div>
                    <p className="oi-story-objective">{s.objective}</p>
                    <p className="oi-story-text">{s.text}</p>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="cw-progress-meta">
                      <span className="raised">{currency(s.raised)} raised</span>
                      <span className="goal">{pct}% of {currency(s.goal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py cat-strip">
        <div className="wrap">
          <div className="section-head on-ink center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">Transparency</span>
            <h2>Every contribution should create a visible impact</h2>
            <p>From the moment a donation is made to the moment a project is complete, the journey stays visible.</p>
          </div>
          <div className="hw-flow-wrap reveal">
            <Flow nodes={transparencyFlow} onInk />
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <span className="eyebrow">Be part of it</span>
          <h2>Empowering Masjids. Creating Impact Beyond Boundaries.</h2>
          <div className="ctas">
            <a href="/explore-campaigns" className="btn btn-gold">
              Explore Campaigns <span className="btn-arrow">→</span>
            </a>
            <a href="/my-community" className="btn btn-outline-paper">
              Visit the Community Wall <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default OurImpact;
