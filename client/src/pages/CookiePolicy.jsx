import React, { useEffect, useState } from "react";
import LegalDocument from "../components/LegalDocument.jsx";

const CONSENT_KEY = "mmc-cookie-consent";
const PREFS_KEY = "mmc-cookie-prefs";

function CookiePreferences() {
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
          <strong>Necessary</strong>
          <p>Required for the Platform to function, such as remembering your cookie consent choice. Always on.</p>
        </div>
        <span className="toggle-switch locked" aria-hidden="true">
          <span className="toggle-knob" />
        </span>
      </div>
      <div className="cookie-pref-row">
        <div>
          <strong>Analytics</strong>
          <p>Helps us understand how visitors use the Platform, such as which campaigns are viewed most, so we can improve it.</p>
        </div>
        <button
          className={`toggle-switch${analytics ? " on" : ""}`}
          onClick={() => setAnalytics((a) => !a)}
          aria-pressed={analytics}
          aria-label="Toggle analytics cookies"
        >
          <span className="toggle-knob" />
        </button>
      </div>
      <div className="cookie-pref-row">
        <div>
          <strong>Marketing</strong>
          <p>Used to show you more relevant campaigns and measure the effectiveness of our outreach.</p>
        </div>
        <button
          className={`toggle-switch${marketing ? " on" : ""}`}
          onClick={() => setMarketing((m) => !m)}
          aria-pressed={marketing}
          aria-label="Toggle marketing cookies"
        >
          <span className="toggle-knob" />
        </button>
      </div>
      <div className="cookie-pref-actions">
        <button className="btn btn-gold" onClick={save}>
          Save Preferences
        </button>
        {saved && <span className="cookie-pref-saved">✓ Preferences saved.</span>}
      </div>
    </div>
  );
}

const sections = [
  {
    id: "what",
    number: "01",
    title: "What Are Cookies",
    body: [
      "Cookies are small text files placed on your device when you visit a website. They let a site remember your actions and preferences over time, and are used across most of the modern web.",
    ],
  },
  {
    id: "types",
    number: "02",
    title: "Types of Cookies We Use",
    body: [
      "Necessary cookies: required for core functionality, such as keeping you signed in and remembering your cookie consent choice.",
      "Analytics cookies: help us understand how the Platform is used so we can improve campaign discovery and the donation flow.",
      "Marketing cookies: help us show more relevant campaigns and measure the effectiveness of our outreach.",
    ],
  },
  {
    id: "how",
    number: "03",
    title: "How We Use Cookies",
    body: [
      "We use cookies to keep your session active while browsing, remember display preferences, and understand aggregate usage patterns across the Platform. We do not use cookies to identify you individually for advertising purposes without your consent.",
    ],
  },
  {
    id: "third-party",
    number: "04",
    title: "Third-Party Cookies",
    body: [
      "Some cookies are set by third parties we work with, such as our payment processor (to securely process donations) and analytics providers (to help us understand site usage). These parties have their own privacy and cookie practices.",
    ],
  },
  {
    id: "manage",
    number: "05",
    title: "Manage Your Preferences",
    body: [
      "You can choose which categories of cookies to allow below. Necessary cookies cannot be turned off, as the Platform relies on them to function.",
    ],
    extra: <CookiePreferences />,
  },
  {
    id: "browser",
    number: "06",
    title: "Browser Controls",
    body: [
      "Most browsers also let you block or delete cookies directly through their settings. Doing so may affect how parts of the Platform function, such as staying signed in.",
    ],
  },
  {
    id: "changes",
    number: "07",
    title: "Changes to This Policy",
    body: [
      "We may update this Cookie Policy from time to time. Material changes will be reflected by an updated \"Last updated\" date below.",
    ],
  },
  {
    id: "contact",
    number: "08",
    title: "Contact Us",
    body: ["Questions about this Cookie Policy can be sent to hello@masjidmycommunity.org."],
  },
];

function CookiePolicy() {
  return (
    <LegalDocument
      title="Cookie Policy"
      updated="January 1, 2026"
      intro="This Cookie Policy explains how Masjid My Community uses cookies and similar technologies, and how you can manage your preferences."
      sections={sections}
    />
  );
}

export default CookiePolicy;
