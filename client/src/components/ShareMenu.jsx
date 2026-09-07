import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icons.jsx";

const POPOVER_WIDTH = 236;

// Brand marks, hand-embedded the same way the map's raw-HTML badges are
// (see ExploreMasjidsMap.jsx) — these are one-off brand glyphs, not part of
// the generic app icon set in Icons.jsx.
const PLATFORMS = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    bg: "#25D366",
    path: "M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.86L2 22l5.34-1.4a9.86 9.86 0 004.7 1.2h.01c5.46 0 9.9-4.45 9.9-9.9C21.96 6.45 17.5 2 12.04 2zm5.8 14.15c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.11.11-1.79-.11-.41-.13-.95-.3-1.63-.6-2.87-1.24-4.74-4.13-4.88-4.32-.14-.19-1.17-1.56-1.17-2.98s.73-2.11 1-2.4c.26-.29.57-.36.76-.36h.55c.17 0 .41-.03.63.48.24.58.8 2 .87 2.15.07.15.12.32.02.51-.09.19-.14.32-.28.49-.14.17-.29.38-.42.51-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.53.72 1.79.85.26.13.43.19.5.3.07.11.07.62-.17 1.3z",
    hrefFor: ({ url, title }) => `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    bg: "#1877F2",
    path: "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.81 8.44-4.94 8.44-9.94z",
    hrefFor: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    bg: "#000000",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    hrefFor: ({ url, title }) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    bg: "#0A66C2",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 11-.001-4.124 2.062 2.062 0 010 4.124zM7.114 20.452H3.558V9h3.556v11.452z",
    hrefFor: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
];

/** A small, curated social-share popover — WhatsApp/Facebook/X/LinkedIn plus
 * Copy Link — used anywhere a page currently just calls navigator.share()
 * (which on desktop opens the OS's full, unfiltered share sheet rather than
 * a focused set of the platforms people actually use). Portaled to <body>
 * and positioned from the trigger's real screen coordinates so it's never
 * clipped by a card's own overflow:hidden (same fix as GreenTickBadge's
 * popover). Controlled: the caller owns `open` state and passes its own
 * trigger button's ref as `anchorRef`. */
function ShareMenu({ open, onClose, anchorRef, url, title, text }) {
  const [coords, setCoords] = useState(null);
  const [copied, setCopied] = useState(false);
  const popRef = useRef(null);

  const updateCoords = () => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - POPOVER_WIDTH - 12);
    setCoords({ top: r.bottom + 8, left: Math.max(left, 12) });
  };

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (anchorRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !coords) return null;

  const openPlatform = (platform) => {
    window.open(platform.hrefFor({ url, title, text }), "_blank", "noopener,noreferrer,width=600,height=640");
    onClose();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(onClose, 1000);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div className="msj-share-menu" ref={popRef} style={{ top: coords.top, left: coords.left }} onClick={(e) => e.stopPropagation()}>
      <div className="msj-share-menu-title">Share via</div>
      <div className="msj-share-menu-grid">
        {PLATFORMS.map((p) => (
          <button type="button" key={p.key} className="msj-share-menu-item" onClick={() => openPlatform(p)}>
            <span className="msj-share-menu-icon" style={{ background: p.bg }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d={p.path} /></svg>
            </span>
            {p.label}
          </button>
        ))}
      </div>
      <button type="button" className="msj-share-menu-copy" onClick={copyLink}>
        <Icon name={copied ? "check" : "link"} size={14} /> {copied ? "Link copied!" : "Copy link"}
      </button>
    </div>,
    document.body
  );
}

export default ShareMenu;
