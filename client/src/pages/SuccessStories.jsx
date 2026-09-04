import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { getSuccessStories } from "../services/successStoryApi.js";
import SuccessStoryCard from "../components/SuccessStoryCard.jsx";

function SuccessStories() {
  const { t, language } = useTranslation();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSuccessStories({ lang: language })
      .then(({ data }) => setStories(data.stories))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  const featured = useMemo(() => stories.filter((s) => s.isFeatured), [stories]);
  const rest = useMemo(() => stories.filter((s) => !s.isFeatured), [stories]);

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
  }, [stories]);

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow">{t("successStoriesPage.hero.eyebrow", "Success Stories")}</span>
          <h1>{t("successStoriesPage.hero.title", "Real change, one masjid at a time")}</h1>
          <p>{t("successStoriesPage.hero.intro", "Meaningful stories of impact from masjids and communities empowered through Masjid My Community.")}</p>
        </div>
      </section>

      {loading ? (
        <section className="py">
          <div className="wrap">
            <div className="campaign-empty">
              <p>{t("successStoriesPage.loading", "Loading…")}</p>
            </div>
          </div>
        </section>
      ) : stories.length === 0 ? (
        <section className="py">
          <div className="wrap">
            <div className="campaign-empty">
              <p>{t("successStoriesPage.empty", "No success stories yet — check back soon.")}</p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="py py-tight-b">
              <div className="wrap">
                <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
                  <span className="eyebrow">{t("successStoriesPage.featured.eyebrow", "Featured")}</span>
                  <h2>{t("successStoriesPage.featured.title", "Stories that stand out")}</h2>
                </div>
                <div className="sscard-grid sscard-grid-featured">
                  {featured.map((item, i) => (
                    <div className="reveal" style={{ transitionDelay: `${Math.min(i, 4) * 0.08}s` }} key={item.id}>
                      <SuccessStoryCard story={item} featured />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className={`py${featured.length > 0 ? " py-tight-t" : ""}`}>
              <div className="wrap">
                <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
                  <span className="eyebrow">{t("successStoriesPage.more.eyebrow", "From our community")}</span>
                  <h2>{t("successStoriesPage.more.title", "More stories of impact")}</h2>
                </div>
                <div className="sscard-grid">
                  {rest.map((item, i) => (
                    <div className="reveal" style={{ transitionDelay: `${Math.min(i, 6) * 0.05}s` }} key={item.id}>
                      <SuccessStoryCard story={item} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default SuccessStories;
