import React from "react";
import { createPortal } from "react-dom";
import { Icon } from "../Icons.jsx";

// The one-time "it's time for Maghrib" visual notification useNextPrayer
// fires alongside the sound/browser Notification -- shared by every screen
// that uses the hook so the alert looks the same everywhere.
function PrayerAlertBanner({ text }) {
  if (!text) return null;
  return createPortal(
    <div className="npc-banner">
      <Icon name="bell" size={18} />
      {text}
    </div>,
    document.body
  );
}

export default PrayerAlertBanner;
