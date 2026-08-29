// Dev: the backend always runs on port 5050, on whatever host the page
// itself was loaded from (rather than hardcoding "localhost") — so the app
// keeps working unchanged when opened via a LAN IP from another device
// (e.g. http://192.168.1.20:5173) instead of localhost.
// Prod: the built client is served by the same Nginx that reverse-proxies
// /api and /uploads to the backend, so same-origin (no host/port prefix)
// is both correct and required — a hardcoded port would break HTTPS via
// mixed-content blocking, and there's no guarantee port 5050 is reachable.
export const API_ORIGIN = import.meta.env.DEV ? `http://${window.location.hostname}:5050` : "";
export const API_BASE = `${API_ORIGIN}/api`;
