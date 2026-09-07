import axios from "axios";
import { API_BASE } from "../config.js";

const API = `${API_BASE}/visitors`;

// Reuses the existing cookie-consent banner (client/src/components/CookieConsent.jsx)
// rather than inventing a second one — its choice is stored in
// localStorage under this exact key/shape. No stored choice yet reads as
// consent given (the banner itself is still what asks); an explicit
// rejection is the only thing that turns tracking off.
function hasAnalyticsConsent() {
  try {
    const prefs = JSON.parse(localStorage.getItem("mmc-cookie-prefs") || "{}");
    return prefs.analytics !== false;
  } catch {
    return true;
  }
}

function utmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
  };
}

export function trackPageView(path, title) {
  if (!hasAnalyticsConsent()) return;
  axios
    .post(
      `${API}/track`,
      {
        path,
        title,
        referrer: document.referrer || undefined,
        ...utmParams(),
        screenWidth: window.innerWidth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
      },
      { withCredentials: true }
    )
    .catch(() => {});
}

export function sendHeartbeat() {
  if (!hasAnalyticsConsent()) return;
  axios.post(`${API}/heartbeat`, {}, { withCredentials: true }).catch(() => {});
}

export function endVisit() {
  if (!hasAnalyticsConsent()) return;
  try {
    navigator.sendBeacon(`${API}/end`, new Blob([JSON.stringify({})], { type: "application/json" }));
  } catch {
    // sendBeacon isn't available/failed — the server's own idle-session
    // sweep closes this session shortly after anyway, so this is never load-bearing.
  }
}

export function getPublicVisitorCount() {
  return axios.get(`${API}/count`).then(({ data }) => data.total);
}

export function subscribeToVisitorCount(onUpdate) {
  if (typeof EventSource === "undefined") return () => {};
  let es = new EventSource(`${API}/stream`);
  let pollTimer = null;
  let errorCount = 0;

  const startPollingFallback = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      getPublicVisitorCount().then(onUpdate).catch(() => {});
    }, 60000);
  };

  es.onmessage = (e) => {
    errorCount = 0;
    try {
      const { total } = JSON.parse(e.data);
      if (typeof total === "number") onUpdate(total);
    } catch {
      // ignore a malformed event rather than tearing down the stream over it
    }
  };
  es.onerror = () => {
    errorCount += 1;
    if (errorCount >= 3) {
      es.close();
      startPollingFallback();
    }
  };

  return () => {
    es.close();
    if (pollTimer) clearInterval(pollTimer);
  };
}
