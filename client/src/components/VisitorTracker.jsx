import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView, sendHeartbeat, endVisit } from "../utils/visitorTracking.js";

const HEARTBEAT_MS = 30000;

// Mounted once inside MarketingLayout (client/src/App.jsx) — never inside
// the admin app, so browsing the admin panel never counts as a site visit.
// Renders nothing; it only ever calls out to visitorTracking.js.
function VisitorTracker() {
  const location = useLocation();
  const lastTrackedPath = useRef(null);
  const lastTrackedAt = useRef(0);

  useEffect(() => {
    const path = location.pathname;
    // Dedupe within 1s — React StrictMode double-invokes effects in dev,
    // which would otherwise log two page views for one real navigation.
    const now = Date.now();
    if (path === lastTrackedPath.current && now - lastTrackedAt.current < 1000) return;
    lastTrackedPath.current = path;
    lastTrackedAt.current = now;
    trackPageView(path, document.title);
  }, [location.pathname]);

  useEffect(() => {
    let interval = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(sendHeartbeat, HEARTBEAT_MS);
    };
    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", endVisit);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", endVisit);
    };
  }, []);

  return null;
}

export default VisitorTracker;
