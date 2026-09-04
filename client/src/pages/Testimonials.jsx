import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { getTestimonials } from "../services/testimonialApi.js";
import TestimonialCard from "../components/TestimonialCard.jsx";

function Testimonials() {
  const { t, language } = useTranslation();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTestimonials({ lang: language })
      .then(({ data }) => setTestimonials(data.testimonials))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  const featured = useMemo(() => testimonials.filter((item) => item.isFeatured), [testimonials]);
  const rest = useMemo(() => testimonials.filter((item) => !item.isFeatured), [testimonials]);

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
  }, [testimonials]);

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow">{t("testimonialsPage.hero.eyebrow", "Testimonials")}</span>
          <h1>{t("testimonialsPage.hero.title", "Voices from our community")}</h1>
          <p>{t("testimonialsPage.hero.intro", "Real stories from the administrators, donors, and volunteers who make Masjid My Community possible.")}</p>
        </div>
      </section>

      {loading ? (
        <section className="py">
          <div className="wrap">
            <div className="campaign-empty">
              <p>{t("testimonialsPage.loading", "Loading…")}</p>
            </div>
          </div>
        </section>
      ) : testimonials.length === 0 ? (
        <section className="py">
          <div className="wrap">
            <div className="campaign-empty">
              <p>{t("testimonialsPage.empty", "No testimonials yet — check back soon.")}</p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="py py-tight-b">
              <div className="wrap">
                <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
                  <span className="eyebrow">{t("testimonialsPage.featured.eyebrow", "Featured")}</span>
                  <h2>{t("testimonialsPage.featured.title", "Stories that stand out")}</h2>
                </div>
                <div className="tcard-grid tcard-grid-featured">
                  {featured.map((item, i) => (
                    <div className="reveal" style={{ transitionDelay: `${Math.min(i, 4) * 0.08}s` }} key={item.id}>
                      <TestimonialCard testimonial={item} featured />
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
                  <span className="eyebrow">{t("testimonialsPage.more.eyebrow", "From our community")}</span>
                  <h2>{t("testimonialsPage.more.title", "In their own words")}</h2>
                </div>
                <div className="tcard-grid">
                  {rest.map((item, i) => (
                    <div className="reveal" style={{ transitionDelay: `${Math.min(i, 6) * 0.05}s` }} key={item.id}>
                      <TestimonialCard testimonial={item} />
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

export default Testimonials;
