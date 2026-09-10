import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DEFAULT_WIDTH = 300;

// Shared anchored-popover shell for the comment composer's Emoji/GIF/Sticker
// trays — same portal-to-body + real-screen-coordinates + outside-click/Esc
// recipe as ShareMenu.jsx, factored out since three pickers need it here.
function ComposerPopover({ open, onClose, anchorRef, width = DEFAULT_WIDTH, className = "", children }) {
  const [coords, setCoords] = useState(null);
  const popRef = useRef(null);

  const updateCoords = () => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - width - 12);
    setCoords({ top: r.bottom + 8, left: Math.max(left, 12) });
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

  return createPortal(
    <div className={`cmt-picker-popover ${className}`} ref={popRef} style={{ top: coords.top, left: coords.left, width }} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  );
}

export default ComposerPopover;
