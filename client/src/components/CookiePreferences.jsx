import React, { useEffect, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const CONSENT_KEY = "mmc-cookie-consent";
const PREFS_KEY = "mmc-cookie-prefs";

// Mounted inside the Cookie Policy page's rich-text content, at whatever
// point the admin-authored HTML contains <div id="cookie-prefs-mount">
// (see LegalDocument's extraMounts) — kept as real interactive React state
// rather than editable content, since it's not text, it's a live control
// backed by localStorage.
function CookiePreferences() {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
      if (stored) {
        setAnalytics(!!stored.analytics);
        setMarketing(!!stored.marketing);
      }
    } catch {
      // ignore malformed stored preferences
    }
  }, []);

  const save = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ analytics, marketing }));
    localStorage.setItem(CONSENT_KEY, "accepted");
    window.dispatchEvent(new Event("mmc-consent-updated"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  return (
    <div className="cookie-pref-panel">
      <div className="cookie-pref-row">
        <div>
          <strong>{t("legalCookies.prefs.necessary.label", "Necessary")}</strong>
          <p>{t("legalCookies.prefs.necessary.desc", "Required for the Platform to function, such as remembering your cookie consent choice. Always on.")}</p>
        </div>
        <span className="toggle-switch locked" aria-hidden="true">
          <span className="toggle-knob" />
        </span>
      </div>
      <div className="cookie-pref-row">
        <div>
          <strong>{t("legalCookies.prefs.analytics.label", "Analytics")}</strong>
          <p>{t("legalCookies.prefs.analytics.desc", "Helps us understand how visitors use the Platform, such as which campaigns are viewed most, so we can improve it.")}</p>
        </div>
        <button
          className={`toggle-switch${analytics ? " on" : ""}`}
          onClick={() => setAnalytics((a) => !a)}
          aria-pressed={analytics}
          aria-label={t("legalCookies.prefs.analytics.aria", "Toggle analytics cookies")}
        >
          <span className="toggle-knob" />
        </button>
      </div>
      <div className="cookie-pref-row">
        <div>
          <strong>{t("legalCookies.prefs.marketing.label", "Marketing")}</strong>
          <p>{t("legalCookies.prefs.marketing.desc", "Used to show you more relevant campaigns and measure the effectiveness of our outreach.")}</p>
        </div>
        <button
          className={`toggle-switch${marketing ? " on" : ""}`}
          onClick={() => setMarketing((m) => !m)}
          aria-pressed={marketing}
          aria-label={t("legalCookies.prefs.marketing.aria", "Toggle marketing cookies")}
        >
          <span className="toggle-knob" />
        </button>
      </div>
      <div className="cookie-pref-actions">
        <button className="btn btn-gold" onClick={save}>
          {t("legalCookies.prefs.save", "Save Preferences")}
        </button>
        {saved && <span className="cookie-pref-saved">{t("legalCookies.prefs.saved", "✓ Preferences saved.")}</span>}
      </div>
    </div>
  );
}

export default CookiePreferences;
