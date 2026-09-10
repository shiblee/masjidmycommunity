import React, { useEffect, useState } from "react";
import userApi from "../services/userApi.js";
import { getStoredUser } from "../utils/userAuthStorage.js";
import MasjidPickerModal from "./MasjidPickerModal.jsx";

// Site-wide, skippable-but-recurring encouragement to pick a "home" masjid —
// mounted once in App.jsx's MarketingLayout, same spot as CookieConsent.
// Unlike that banner, the skip is tracked server-side (User.primaryMasjidPromptSkippedAt),
// so the reminder interval is account-level, not per-browser: logging in on
// a different device still respects a recent skip. The actual picker UI is
// MasjidPickerModal — also reused by the profile page's "Change Primary
// Masjid" button — this component only owns the "should it be open" check.
function PrimaryMasjidPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getStoredUser()) return;
    userApi
      .get("/me/primary-masjid-status")
      .then(({ data }) => {
        if (data.shouldPrompt) setOpen(true);
      })
      .catch(() => {});
  }, []);

  if (!open) return null;

  return <MasjidPickerModal onClose={() => setOpen(false)} onSelected={() => setOpen(false)} onSkip={() => setOpen(false)} />;
}

export default PrimaryMasjidPrompt;
