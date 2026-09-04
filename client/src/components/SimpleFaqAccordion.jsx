import React, { useState } from "react";

// A lightweight, self-contained accordion for static Q&A content on
// informational pages (Explore Campaigns, How It Works, Verified Masjid) —
// unlike FaqAccordion.jsx it isn't wired to the FAQ backend or AI feedback,
// just a plain { q, a } array passed in by the page.
function SimpleFaqAccordion({ items }) {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="simple-accordion">
      {items.map((item, i) => (
        <div className={`simple-accordion-item${openIdx === i ? " open" : ""}`} key={i}>
          <button type="button" className="simple-accordion-q" onClick={() => setOpenIdx((o) => (o === i ? -1 : i))} aria-expanded={openIdx === i}>
            {item.q}
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <div className="simple-accordion-a" style={{ maxHeight: openIdx === i ? 400 : 0 }}>
            <div className="simple-accordion-a-inner">{item.a}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SimpleFaqAccordion;
