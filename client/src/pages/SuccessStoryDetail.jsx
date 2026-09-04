import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { getSuccessStory } from "../services/successStoryApi.js";
import { API_ORIGIN } from "../config.js";

function SuccessStoryDetail() {
  const { slug } = useParams();
  const { t, language } = useTranslation();
  const [story, setStory] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setStory(null);
    setNotFound(false);
    getSuccessStory(slug, { lang: language })
      .then(({ data }) => setStory(data.story))
      .catch(() => setNotFound(true));
  }, [slug, language]);

  if (notFound) {
    return (
      <main className="au-page">
        <div className="wrap py-lg msj-empty-state">
          <Icon name="mosque" size={30} />
          <h3>{t("successStoryDetail.notFound.title", "This story isn't available")}</h3>
          <p>{t("successStoryDetail.notFound.body", "It may not be published yet, or the link may be incorrect.")}</p>
          <Link to="/success-stories" className="btn btn-gold">{t("successStoryDetail.notFound.cta", "Browse Success Stories")}</Link>
        </div>
      </main>
    );
  }

  if (!story) return <main className="au-page"><div className="wrap py-lg"><p>{t("successStoriesPage.loading", "Loading…")}</p></div></main>;

  const highlightLines = (story.highlights || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const paragraphs = (story.story || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const subtitle = [story.masjidName, story.location].filter(Boolean).join(" — ");

  return (
    <main className="au-page">
      <section className="au-hero on-ink ssdetail-hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <Link to="/success-stories" className="ssdetail-back">
            <Icon name="chevronLeft" size={15} /> {t("successStoryDetail.back", "All Success Stories")}
          </Link>
          {subtitle && <span className="eyebrow">{subtitle}</span>}
          <h1>{story.title}</h1>
          <p>{story.summary}</p>
        </div>
      </section>

      {story.imageUrl && (
        <div className="wrap ssdetail-image-wrap">
          <img className="ssdetail-image" src={`${API_ORIGIN}${story.imageUrl}`} alt="" />
        </div>
      )}

      <section className="py py-tight-t">
        <div className="wrap ssdetail-layout">
          <article className="ssdetail-body">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </article>

          {highlightLines.length > 0 && (
            <aside className="ssdetail-side">
              <div className="ssdetail-side-card">
                <h4>{t("successStoryDetail.highlights", "Key Highlights")}</h4>
                <ul>
                  {highlightLines.map((h, i) => (
                    <li key={i}>
                      <Icon name="check" size={14} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </section>
    </main>
  );
}

export default SuccessStoryDetail;
