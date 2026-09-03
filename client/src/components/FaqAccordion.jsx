import React, { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext.jsx";

// Extracted from the old Home.jsx FAQ section and generalized to work off
// real { id, question, answer } data instead of a hardcoded array. Thumbs
// feedback here is local/session-only UI polish (not persisted) — separate
// from AskAiPanel's feedback, which is persisted against an AiQueryLog row.
function highlightMatch(text, query) {
  if (!query?.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="faq-mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// Measures its own content instead of a fixed max-height — answers vary a
// lot in length (a one-line policy pointer vs. a multi-sentence paragraph),
// and across languages the same answer can wrap to a very different number
// of lines, so a hardcoded pixel value either clips long content or leaves
// huge empty space under short content.
function FaqItem({ faq, isOpen, onToggle, searchQuery, feedback, onFeedback, t }) {
  const contentRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState(0);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setMaxHeight(isOpen ? el.scrollHeight : 0);
    measure();
    if (!isOpen) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, faq.answer]);

  return (
    <div className={`faq-item${isOpen ? " open" : ""}`} id={`faq-${faq.id}`}>
      <button className="faq-q" onClick={onToggle} aria-expanded={isOpen}>
        <span>{highlightMatch(faq.question, searchQuery)}</span>
        <span className="plus">+</span>
      </button>
      <div className="faq-a" style={{ maxHeight: `${maxHeight}px` }}>
        <div ref={contentRef}>
          <p>{highlightMatch(faq.answer, searchQuery)}</p>
          <div className="faq-feedback">
            <span>{t("faqPage.wasHelpful", "Was this helpful?")}</span>
            <button
              className={`faq-fb${feedback === "up" ? " active" : ""}`}
              onClick={() => onFeedback("up")}
              aria-label="Yes, this was helpful"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 22V11M2 13v7a2 2 0 002 2h13.4a2 2 0 002-1.6l1.4-7A2 2 0 0018.8 11H14l1-5a2 2 0 00-2-2.3L11 9H7" />
              </svg>
            </button>
            <button
              className={`faq-fb${feedback === "down" ? " active" : ""}`}
              onClick={() => onFeedback("down")}
              aria-label="Not helpful"
              style={{ transform: "rotate(180deg)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 22V11M2 13v7a2 2 0 002 2h13.4a2 2 0 002-1.6l1.4-7A2 2 0 0018.8 11H14l1-5a2 2 0 00-2-2.3L11 9H7" />
              </svg>
            </button>
            {feedback && <span className="faq-fb-thanks">{t("faqPage.thanksFeedback", "Thanks for your feedback!")}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqAccordion({ faqs, searchQuery = "", emptyMessage = "No questions match your search." }) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState(null);
  const [feedback, setFeedback] = useState({});

  const setFeedbackFor = (id, val) => setFeedback((prev) => ({ ...prev, [id]: prev[id] === val ? null : val }));

  if (faqs.length === 0) {
    return (
      <div className="campaign-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="faq-list">
      {faqs.map((f) => (
        <FaqItem
          key={f.id}
          faq={f}
          isOpen={openId === f.id}
          onToggle={() => setOpenId(openId === f.id ? null : f.id)}
          searchQuery={searchQuery}
          feedback={feedback[f.id]}
          onFeedback={(val) => setFeedbackFor(f.id, val)}
          t={t}
        />
      ))}
    </div>
  );
}

export default FaqAccordion;
