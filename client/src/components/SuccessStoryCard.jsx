import React from "react";
import { Link } from "react-router-dom";
import { API_ORIGIN } from "../config.js";

// Shared by the public Success Stories grid and the admin "preview" modal —
// one card implementation so an admin editing a row sees exactly what
// visitors will see. `interactive` controls whether the whole card links
// through to the detail page (public grid) or renders inert (admin preview,
// where navigating away mid-edit would be confusing).
function SuccessStoryCard({ story, featured = false, interactive = true }) {
  const { title, slug, summary, imageUrl, masjidName, location, highlights } = story;
  const highlightLines = (highlights || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
  const subtitle = [masjidName, location].filter(Boolean).join(" — ");

  const content = (
    <>
      <div className="sscard-img">
        {imageUrl ? (
          <img src={`${API_ORIGIN}${imageUrl}`} alt="" />
        ) : (
          <div className="sscard-img-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 21V11l8-6 8 6v10" />
              <path d="M9 21v-6a3 3 0 016 0v6" />
            </svg>
          </div>
        )}
        {featured && <span className="sscard-featured-badge">Featured</span>}
      </div>
      <div className="sscard-body">
        {subtitle && <span className="sscard-subtitle">{subtitle}</span>}
        <h3 className="sscard-title">{title}</h3>
        <p className="sscard-summary">{summary}</p>
        {highlightLines.length > 0 && (
          <ul className="sscard-highlights">
            {highlightLines.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
        {interactive && (
          <span className="sscard-link">
            Read the full story <span className="btn-arrow">→</span>
          </span>
        )}
      </div>
    </>
  );

  if (interactive) {
    return (
      <Link to={`/success-stories/${slug}`} className={`sscard${featured ? " sscard-featured" : ""}`}>
        {content}
      </Link>
    );
  }
  return <article className={`sscard${featured ? " sscard-featured" : ""}`}>{content}</article>;
}

export default SuccessStoryCard;
