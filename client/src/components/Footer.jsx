import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { getStoredUser } from "../utils/userAuthStorage.js";

// Native script alone reads fine once you know the language, but a visitor
// who can't yet read Urdu/Arabic/Hindi script has no way to tell the options
// apart — pairing it with the English name makes every option recognizable
// regardless of which languages the visitor can currently read.
function languageLabel(l) {
  return l.name === l.nativeName ? l.name : `${l.nativeName} (${l.name})`;
}

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

// A custom listbox instead of a native <select> — this control always sits at
// the very bottom of the page, so a native select's popup (which Chrome opens
// upward/downward based on viewport space, and which real mobile OSes render
// as a full native picker rather than a page-positioned popup) had nowhere
// good to open and looked broken. This version always opens upward, since
// there's rarely room below a footer control, and its position is CSS we
// control directly instead of leaving to the browser/OS.
function LanguageSelect({ triggerClassName }) {
  const { languages, language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const selected = languages.find((l) => l.code === language) || languages[0];
  if (!selected) return null;

  return (
    <div className="footer-lang" ref={ref}>
      <button type="button" className={triggerClassName} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {languageLabel(selected)}
        <svg className={`footer-lang-chev${open ? " open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="footer-lang-dropdown" role="listbox">
          {languages.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                className={l.code === selected.code ? "active" : ""}
                role="option"
                aria-selected={l.code === selected.code}
                onClick={() => {
                  setLanguage(l.code);
                  setOpen(false);
                }}
              >
                {languageLabel(l)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VisitorCounter() {
  const ref = useRef(null);
  const [count, setCount] = useState(0);
  const [settled, setSettled] = useState(false);
  const BASE = 1248392;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dur = 1800;
            const start = performance.now();
            function tick(now) {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              setCount(Math.round(BASE * eased));
              if (p < 1) requestAnimationFrame(tick);
              else setSettled(true);
            }
            requestAnimationFrame(tick);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!settled) return;
    const id = setInterval(() => {
      setCount((c) => c + Math.floor(Math.random() * 5) + 1);
    }, 3500);
    return () => clearInterval(id);
  }, [settled]);

  return (
    <span className="visitor-count">
      {settled && <span className="live-dot" aria-hidden="true" />}
      <span ref={ref} className="mono">
        {count.toLocaleString("en-US")}
        {settled ? "" : "+"}
      </span>
    </span>
  );
}

function FootStat({ n, prefix = "", suffix = "" }) {
  const ref = useRef(null);
  const [text, setText] = useState("0");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dur = 1600;
            const start = performance.now();
            function tick(now) {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              setText(prefix + Math.round(n * eased).toLocaleString("en-US") + suffix);
              if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n, prefix, suffix]);
  return (
    <span ref={ref} className="mono">
      {text}
    </span>
  );
}

function BackToTop() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [aboveBanner, setAboveBanner] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function update() {
      setVisible(window.scrollY > 700);
      setAboveBanner(!!document.querySelector(".cookie-banner"));
      const doc = document.documentElement;
      const height = doc.scrollHeight - doc.clientHeight;
      setProgress(height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", update);
      mo.disconnect();
    };
  }, []);
  const r = 19;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <button
      className={`back-to-top${visible ? " visible" : ""}${aboveBanner ? " above-banner" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("footer.backToTopAria", "Back to top")}
    >
      <svg className="back-to-top-ring" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(141,198,63,.22)" strokeWidth="2" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="#A3D65C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <svg className="back-to-top-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

function AppBadge({ store }) {
  const { t } = useTranslation();
  const isApple = store === "apple";
  return (
    <a
      href="#"
      className="app-badge"
      aria-label={isApple ? t("footer.appBadge.appleAria", "Download on the App Store") : t("footer.appBadge.googleAria", "Get it on Google Play")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="2" width="12" height="20" rx="2" />
        {isApple ? <path d="M9 17l3 3 3-3" /> : <path d="M9.5 8.5l5 3.5-5 3.5z" fill="currentColor" stroke="none" />}
      </svg>
      <span>
        <small>{isApple ? t("footer.appBadge.appleTop", "Download on the") : t("footer.appBadge.googleTop", "GET IT ON")}</small>
        <strong>{isApple ? t("footer.appBadge.appleBottom", "App Store") : t("footer.appBadge.googleBottom", "Google Play")}</strong>
      </span>
    </a>
  );
}

function Footer() {
  const { t } = useTranslation();
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".foot-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 80px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <footer id="contact">
        <div className="wrap">
          <div className="foot-stats foot-reveal">
            <div>
              <VisitorCounter />
              <span>{t("footer.stats.totalVisitors", "Total Visitors")}</span>
            </div>
            <div>
              <FootStat n={1250} suffix="+" />
              <span>{t("footer.stats.masjidsRegistered", "Masjids Registered")}</span>
            </div>
            <div>
              <FootStat n={2500000} prefix="₹" suffix="+" />
              <span>{t("footer.stats.fundsRaised", "Funds Raised")}</span>
            </div>
            <div>
              <FootStat n={84600} suffix="+" />
              <span>{t("footer.stats.appDownloads", "App Downloads")}</span>
            </div>
          </div>

          <div className="footer-top">
            <div className="footer-brand foot-reveal">
              <Link to={user ? "/my-community" : "/"} className="logo">
                <img src="/logo.svg" alt="Masjid My Community logo" />
                Masjid <em>My Community</em>
              </Link>
              <p>
                {t(
                  "footer.tagline",
                  "A global platform connecting verified masjids with people who want to fund, strengthen and empower them."
                )}
              </p>
              <div className="social-row">
                <a href="#" aria-label="Instagram">
                  <svg viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4.2" />
                    <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a href="#" aria-label="X (Twitter)">
                  <svg viewBox="0 0 24 24">
                    <path d="M4 4l16 16M20 4L4 20" />
                  </svg>
                </a>
                <a href="#" aria-label="YouTube">
                  <svg viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="4" />
                    <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="footer-links-grid">
              <div className="footer-col foot-reveal">
                <h4>{t("footer.col.platform", "Platform")}</h4>
                <NavLink to="/explore-campaigns">{t("footer.link.exploreCampaigns", "Explore Campaigns")}</NavLink>
                <NavLink to="/how-it-works">{t("footer.link.howItWorks", "How It Works")}</NavLink>
                <NavLink to="/verified-masjid">{t("footer.link.verifiedMasjids", "Verified Masjids")}</NavLink>
                <NavLink to="/our-impact">{t("footer.link.ourImpact", "Our Impact")}</NavLink>
              </div>
              <div className="footer-col foot-reveal">
                <h4>{t("footer.col.forMasjids", "For Masjids")}</h4>
                <Link to="/#register">{t("footer.link.registerMasjid", "Register Your Masjid")}</Link>
              </div>
              <div className="footer-col foot-reveal">
                <h4>{t("footer.col.forDonors", "For Donors")}</h4>
                <NavLink to="/success-stories">{t("footer.link.successStories", "Success Stories")}</NavLink>
                <NavLink to="/testimonials">{t("footer.link.testimonials", "Testimonials")}</NavLink>
              </div>
              <div className="footer-col foot-reveal">
                <h4>{t("footer.col.resources", "Resources")}</h4>
                <NavLink to="/faq">{t("footer.link.faq", "FAQ")}</NavLink>
                <NavLink to="/about">{t("footer.link.aboutUs", "About Masjid My Community")}</NavLink>
                <NavLink to="/contact">{t("footer.link.contact", "Contact")}</NavLink>
              </div>
              <div className="footer-col footer-app foot-reveal">
                <h4>{t("footer.col.getTheApp", "Get the App")}</h4>
                <AppBadge store="apple" />
                <AppBadge store="google" />
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="copy">{t("footer.copyright", "© 2026 Masjid My Community.")}</span>
            <nav className="foot-legal">
              <NavLink to="/terms">{t("footer.legal.terms", "Terms of Use")}</NavLink>
              <span className="foot-legal-sep">—</span>
              <NavLink to="/privacy">{t("footer.legal.privacy", "Privacy Policy")}</NavLink>
              <span className="foot-legal-sep">—</span>
              <NavLink to="/raise-a-concern">{t("footer.legal.raiseConcern", "Raise a Concern")}</NavLink>
              <span className="foot-legal-sep">—</span>
              <NavLink to="/cookie-policy">{t("footer.legal.cookiePolicy", "Cookie Policy")}</NavLink>
              <span className="foot-legal-sep">—</span>
              <NavLink to="/sitemap">{t("footer.legal.sitemap", "Sitemap")}</NavLink>
            </nav>
            <div className="selectors">
              <LanguageSelect triggerClassName="foot-select" />
            </div>
          </div>
        </div>
      </footer>
      <div className="footer-mobile">
        <span className="footer-mobile-copy">{t("footer.copyright", "© 2026 Masjid My Community.")}</span>
        <LanguageSelect triggerClassName="footer-mobile-select" />
      </div>
      <BackToTop />
    </>
  );
}

export default Footer;
