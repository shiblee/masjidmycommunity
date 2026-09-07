import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Icon } from "../Icons.jsx";

const POPOVER_WIDTH = 270;

// The one Green Tick badge used everywhere a masjid's name appears —
// Explore Grid/List/Map, Nearby, Masjid Detail, My Masjid, Campaign pages,
// Admin Panel. Reads the same `isGreenTick`/`verificationId`/`issuedAt`
// fields every masjid-serializing endpoint now attaches (mirrors how
// EngagementRow.jsx centralizes Like/Rating), so there's nothing page-
// specific to configure beyond `variant`, which only changes icon size and
// whether the "Verified" label is spelled out.
function GreenTickBadge({ masjid, variant = "list", className = "" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const ref = useRef(null);
  const popoverRef = useRef(null);

  // Cards this badge sits inside (Explore grid/list, map popups, admin
  // tables…) use `overflow:hidden` for their own rounded corners/cover
  // image, which was silently clipping the popover whenever it opened near
  // a card edge. Portaling it to <body> and positioning it from the
  // trigger's real screen coordinates (same fix as AdminLayout's
  // NavDropdown) sidesteps that clipping everywhere this badge is used.
  const updateCoords = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - POPOVER_WIDTH - 12);
    setCoords({ top: r.bottom + 10, left: Math.max(left, 12) });
  };

  useEffect(() => {
    if (!open) return;
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
    const onClick = (e) => {
      if (ref.current?.contains(e.target) || popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!masjid?.isGreenTick) return null;

  const iconSize = variant === "detail" ? 15 : 11;
  const verbose = variant === "detail";

  return (
    <span className={`msj-greentick-badge msj-greentick-badge-${variant} ${className}`} ref={ref}>
      <button
        type="button"
        className="msj-greentick-badge-trigger"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Green Tick verified — view details"
        aria-expanded={open}
      >
        <span className="msj-greentick-badge-icon"><Icon name="check" size={iconSize} /></span>
        {verbose && <span className="msj-greentick-badge-text">Verified</span>}
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            className="msj-greentick-badge-popover"
            ref={popoverRef}
            style={{ top: coords.top, left: coords.left }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div className="msj-greentick-badge-popover-title">
              <span className="msj-greentick-badge-icon"><Icon name="check" size={11} /></span> Verified
            </div>
            <p>
              Masjid My Community has completed its defined verification process for this masjid and its
              authorized representatives, based on the information and documents reviewed.
            </p>
            <div className="msj-greentick-badge-popover-meta">
              <span>ID <strong>{masjid.verificationId}</strong></span>
              {masjid.issuedAt && <span>Since {new Date(masjid.issuedAt).toLocaleDateString()}</span>}
            </div>
            <Link to={`/verify-masjid/${masjid.verificationId}`} onClick={(e) => e.stopPropagation()}>
              View public certificate →
            </Link>
          </div>,
          document.body
        )}
    </span>
  );
}

export default GreenTickBadge;
