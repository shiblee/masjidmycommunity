import React from "react";
import { API_ORIGIN } from "../config.js";
import { formatDate } from "../utils/formatDateTime.js";

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

// Shared by the public Testimonials page and the admin "preview" modal, so
// an admin editing a row sees exactly what visitors will see — one card
// implementation, not two that can drift apart.
export function StarRating({ value }) {
  if (!value) return null;
  return (
    <div className="tcard-rating" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" width={14} height={14} fill={n <= value ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial, featured = false, className = "" }) {
  const { authorName, designation, photoUrl, quote, rating, testimonialDate } = testimonial;
  return (
    <article className={`tcard${featured ? " tcard-featured" : ""}${className ? ` ${className}` : ""}`}>
      <svg className="tcard-quote-mark" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7c0-2.5 2-4 4-4v2c-1 0-2 1-2 2v1h2v5H3V7z" />
        <path d="M13 7c0-2.5 2-4 4-4v2c-1 0-2 1-2 2v1h2v5h-4V7z" />
      </svg>
      <StarRating value={rating} />
      <p className="tcard-quote">{quote}</p>
      <div className="tcard-person">
        <span className="tcard-avatar">
          {photoUrl ? <img src={`${API_ORIGIN}${photoUrl}`} alt="" /> : initialsOf(authorName)}
        </span>
        <div className="tcard-person-body">
          <span className="tcard-name">{authorName}</span>
          {designation && <span className="tcard-designation">{designation}</span>}
        </div>
        {testimonialDate && <span className="tcard-date">{formatDate(testimonialDate)}</span>}
      </div>
    </article>
  );
}

export default TestimonialCard;
