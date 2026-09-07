import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icons.jsx";

// The one Green Tick badge used everywhere a masjid's name appears —
// Explore Grid/List/Map, Nearby, Masjid Detail, My Masjid, Campaign pages,
// Admin Panel. Reads the same `isGreenTick`/`verificationId`/`issuedAt`
// fields every masjid-serializing endpoint now attaches (mirrors how
// EngagementRow.jsx centralizes Like/Rating), so there's nothing page-
// specific to configure beyond `variant`, which only changes icon size and
// whether the "Green Tick Verified" label is spelled out.
function GreenTickBadge({ masjid, variant = "list", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!masjid?.isGreenTick) return null;

  const iconSize = variant === "detail" ? 14 : 10;
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
        {verbose && <span className="msj-greentick-badge-text">Green Tick Verified</span>}
      </button>

      {open && (
        <div className="msj-greentick-badge-popover" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div className="msj-greentick-badge-popover-title">
            <span className="msj-greentick-badge-icon"><Icon name="check" size={11} /></span> Green Tick Verified
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
        </div>
      )}
    </span>
  );
}

export default GreenTickBadge;
