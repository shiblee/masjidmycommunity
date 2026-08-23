import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

function CopyLinkButton({ id }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API unavailable; the address bar still updates below
    }
    window.location.hash = id;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button className={`legal-copy${copied ? " copied" : ""}`} onClick={copy} aria-label="Copy link to this section">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11.5 4.5" />
        <path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L12.5 19.5" />
      </svg>
      <span>{copied ? "Copied!" : "Copy link"}</span>
    </button>
  );
}

function LegalDocument({ title, updated, intro, sections }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);

  useEffect(() => {
    const els = document.querySelectorAll(".legal-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 60px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const targets = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [sections]);

  return (
    <main className="wrap legal-page">
      <ReadingProgress />
      <div className="legal-head">
        <span className="eyebrow">Legal</span>
        <h1>{title}</h1>
        <div className="legal-meta">
          <p className="legal-updated">Last updated: {updated}</p>
          <button className="legal-print" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Print
          </button>
        </div>
        <p className="legal-intro">{intro}</p>
      </div>

      <div className="legal-body">
        <nav className="legal-toc" aria-label="Table of contents">
          <span className="legal-toc-label">On this page</span>
          {sections.map((s) => (
            <a href={`#${s.id}`} className={activeId === s.id ? "active" : ""} key={s.id}>
              {s.number}. {s.title}
            </a>
          ))}
        </nav>

        <div className="legal-sections">
          {sections.map((s) => (
            <section className="legal-section legal-reveal" id={s.id} key={s.id}>
              <div className="legal-section-head">
                <span className="legal-num">{s.number}</span>
                <h2>{s.title}</h2>
                <CopyLinkButton id={s.id} />
              </div>
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {s.extra}
            </section>
          ))}
        </div>
      </div>

      <Link to="/" className="legal-back">
        ← Back to home
      </Link>
    </main>
  );
}

export default LegalDocument;
