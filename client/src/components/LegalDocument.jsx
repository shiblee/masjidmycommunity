import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext.jsx";

function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let ticking = false;
    function update() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      setPct(height > 0 ? (scrollTop / height) * 100 : 0);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="scroll-progress" style={{ width: `${pct}%` }} aria-hidden="true" />;
}

function slugify(text) {
  return (
    String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

// Renders one static page: fetched title + rich-text bodyHtml, a sticky
// table of contents auto-built from the body's <h2> headings (so admins can
// add/reorder/remove sections in the Pages editor with no frontend change),
// and — for pages like Cookie Policy that need a live widget inside the
// content — an extraMounts map of elementId -> React node, portaled into a
// matching element the editor content contains (e.g. <div id="...">).
// A leading <p> before any section heading reads as the document's intro —
// pulled out so it can sit full-width under the title instead of being
// squeezed into the narrower two-column section area.
function splitIntro(bodyHtml) {
  const scratch = document.createElement("div");
  scratch.innerHTML = bodyHtml || "";
  const first = scratch.firstElementChild;
  if (first && first.tagName === "P") {
    first.remove();
    return { introHtml: first.innerHTML, restHtml: scratch.innerHTML };
  }
  return { introHtml: "", restHtml: bodyHtml || "" };
}

function LegalDocument({ title, bodyHtml, extraMounts }) {
  const { t } = useTranslation();
  const bodyRef = useRef(null);
  const [toc, setToc] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [mountNodes, setMountNodes] = useState({});

  const { introHtml, restHtml } = useMemo(() => splitIntro(bodyHtml), [bodyHtml]);

  useEffect(() => {
    const container = bodyRef.current;
    if (!container) return;

    const headings = Array.from(container.querySelectorAll("h2"));
    const seen = {};
    const items = headings.map((h) => {
      let id = slugify(h.textContent);
      if (seen[id]) {
        seen[id] += 1;
        id = `${id}-${seen[id]}`;
      } else {
        seen[id] = 1;
      }
      h.id = id;
      return { id, text: h.textContent };
    });
    setToc(items);
    setActiveId(items[0]?.id || null);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => io.observe(h));

    const nodes = {};
    Object.keys(extraMounts || {}).forEach((id) => {
      const el = container.querySelector(`#${id}`);
      if (el) nodes[id] = el;
    });
    setMountNodes(nodes);

    return () => io.disconnect();
  }, [restHtml, extraMounts]);

  return (
    <main className="wrap legal-page">
      <ReadingProgress />
      <div className="legal-head">
        <span className="eyebrow">{t("legalCommon.eyebrow", "Legal")}</span>
        <h1>{title}</h1>
        {introHtml && <p className="legal-intro" dangerouslySetInnerHTML={{ __html: introHtml }} />}
      </div>

      <div className="legal-body">
        {toc.length > 0 && (
          <nav className="legal-toc" aria-label="Table of contents">
            <span className="legal-toc-label">{t("legalCommon.onThisPage", "On this page")}</span>
            {toc.map((item, i) => (
              <a href={`#${item.id}`} className={activeId === item.id ? "active" : ""} key={item.id}>
                {String(i + 1).padStart(2, "0")}. {item.text}
              </a>
            ))}
          </nav>
        )}

        <div className="legal-sections" ref={bodyRef} dangerouslySetInnerHTML={{ __html: restHtml }} />
        {Object.entries(extraMounts || {}).map(([id, node]) => mountNodes[id] && createPortal(node, mountNodes[id], id))}
      </div>

      <Link to="/" className="legal-back">
        {t("legalCommon.backToHome", "← Back to home")}
      </Link>
    </main>
  );
}

export default LegalDocument;
