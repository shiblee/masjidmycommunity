import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const CONSENT_KEY = "mmc-cookie-consent";
const PREFS_KEY = "mmc-cookie-prefs";

function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const acceptBtnRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY) !== "accepted") {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    const onConsentUpdated = () => {
      if (localStorage.getItem(CONSENT_KEY) === "accepted") setVisible(false);
    };
    window.addEventListener("mmc-consent-updated", onConsentUpdated);
    return () => window.removeEventListener("mmc-consent-updated", onConsentUpdated);
  }, []);

  useEffect(() => {
    if (visible) acceptBtnRef.current?.focus();
  }, [visible]);

  const recordChoice = (prefs) => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.setItem(CONSENT_KEY, "accepted");
    window.dispatchEvent(new Event("mmc-consent-updated"));
    setVisible(false);
  };

  const acceptAll = () => recordChoice({ analytics: true, marketing: true });
  const rejectNonEssential = () => recordChoice({ analytics: false, marketing: false });
  const managePreferences = () => navigate("/cookie-policy#manage");

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <p>
        We use cookies to keep Masjid My Community running and to understand how donors use the site. Choose how you'd like
        us to use them — see our <Link to="/cookie-policy">Cookie Policy</Link> for details.
      </p>
      <div className="cookie-actions">
        <button className="cookie-manage" onClick={managePreferences}>
          Manage Preferences
        </button>
        <button className="btn btn-outline-paper" onClick={rejectNonEssential}>
          Reject Non-Essential
        </button>
        <button className="btn btn-gold" onClick={acceptAll} ref={acceptBtnRef}>
          Accept All Cookies
        </button>
      </div>
    </div>
  );
}

export default CookieConsent;
