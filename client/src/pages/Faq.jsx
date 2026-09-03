import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icons.jsx";
import FaqAccordion from "../components/FaqAccordion.jsx";
import AskAiPanel from "../components/AskAiPanel.jsx";
import MicButton from "../components/MicButton.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { getFaqs } from "../services/faqApi.js";

const CATEGORY_KEY = {
  "About Masjid My Community": "aboutUs",
  "Vision & Mission": "visionMission",
  "Masjid Empowerment": "empowerment",
  "Community": "community",
  "Privacy & Security": "privacy",
  "Terms & Policies": "terms",
  "Platform Features": "platform",
  "Getting Started": "gettingStarted",
};

function Faq() {
  const { t, language } = useTranslation();
  const categoryLabel = (c) => t(`faqPage.category.${CATEGORY_KEY[c] || "aboutUs"}`, c);
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    setLoading(true);
    getFaqs({ lang: language })
      .then(({ data }) => {
        setFaqs(data.faqs);
        setCategories(data.categories);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((f) => {
      const matchesCategory = activeCategory === "all" || f.category === activeCategory;
      const matchesQuery = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [faqs, query, activeCategory]);

  const featured = useMemo(() => faqs.filter((f) => f.isFeatured), [faqs]);
  const suggestedQuestions = useMemo(() => featured.slice(0, 4).map((f) => f.question), [featured]);

  // Content loads asynchronously, so .reveal elements don't all exist at
  // mount — re-scan whenever the fetched list changes rather than once.
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
  }, [faqs]);

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow">{t("faqPage.hero.eyebrow", "FAQ")}</span>
          <h1>{t("faqPage.hero.title", "How can we help you?")}</h1>
          <p>{t("faqPage.hero.intro", "Find an answer below, or ask our AI assistant anything about Masjid My Community.")}</p>

          <div className="faq-search reveal" style={{ margin: "28px auto 0" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.6" y2="16.6" />
            </svg>
            <input
              type="text"
              placeholder={t("faqPage.hero.searchPlaceholder", "Search frequently asked questions…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="faq-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                ×
              </button>
            )}
            <MicButton onTranscript={(text) => setQuery(text)} className="faq-search-mic" />
          </div>
        </div>
      </section>

      {featured.length > 0 && !query && activeCategory === "all" && (
        <section className="py py-tight-b">
          <div className="wrap">
            <div className="section-head center reveal" style={{ margin: "0 auto 8px" }}>
              <span className="eyebrow">{t("faqPage.popular.eyebrow", "Popular questions")}</span>
              <h2>{t("faqPage.popular.title", "What people ask most")}</h2>
            </div>
            <div className="faq-popular-grid">
              {featured.map((f) => (
                <a href={`#faq-${f.id}`} className="faq-popular-card" key={f.id}>
                  {f.icon && (
                    <span className="faq-popular-icon">
                      <Icon name={f.icon} size={18} />
                    </span>
                  )}
                  <span>{f.question}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py py-tight-t">
        <div className="wrap">
          <div className="faq-category-chips reveal">
            <button className={`faq-category-chip${activeCategory === "all" ? " active" : ""}`} onClick={() => setActiveCategory("all")}>
              {t("faqPage.categories.all", "All")}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`faq-category-chip${activeCategory === c ? " active" : ""}`}
                onClick={() => setActiveCategory(c)}
              >
                {categoryLabel(c)}
              </button>
            ))}
          </div>

          {query.trim() && (
            <div className="filter-count">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
            </div>
          )}

          {loading ? (
            <div className="campaign-empty">
              <p>{t("faqPage.loading", "Loading…")}</p>
            </div>
          ) : (
            <FaqAccordion faqs={filtered} searchQuery={query} emptyMessage={t("faqPage.emptyMessage", "No questions match your search or filter.")} />
          )}
        </div>
      </section>

      <section className="py au-refs-section" id="ask-ai">
        <div className="wrap">
          <AskAiPanel suggestedQuestions={suggestedQuestions} />
        </div>
      </section>
    </main>
  );
}

export default Faq;
