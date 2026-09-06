import { API_BASE } from "../config.js";

let settingsPromise = null;

/**
 * Fetches the admin-configured map settings (Google Maps API key + address
 * search country bias) from the backend — set via Admin → Settings →
 * Google Maps, no rebuild/redeploy needed to change them. Falls back to the
 * build-time env vars when the admin hasn't set a value yet (or the request
 * fails), so existing deployments keep working with zero migration.
 * Memoized for the life of the page load.
 */
export function getMapSettings() {
  if (!settingsPromise) {
    settingsPromise = fetch(`${API_BASE}/masjids/public/map-settings`)
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((data) => ({
        googleMapsApiKey: data.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        addressCountry: (data.addressCountry || import.meta.env.VITE_ADDRESS_COUNTRY || "in").trim().toLowerCase(),
      }));
  }
  return settingsPromise;
}

let bootstrapped = false;

/**
 * Runs Google's official inline bootstrap loader, which defines
 * `google.maps.importLibrary` synchronously and lazily injects the real
 * Maps JS bundle the first time a library is actually imported. This is
 * required — a plain `<script src="...maps/api/js?...">` tag never defines
 * `importLibrary` at all, even once fully loaded, no matter what query
 * params are added to it.
 */
export async function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) return window.google;

  const { googleMapsApiKey } = await getMapSettings();
  if (!googleMapsApiKey) throw new Error("Google Maps API key is not configured.");

  if (!bootstrapped) {
    bootstrapped = true;
    ((g) => {
      let h;
      let a;
      let k;
      const p = "The Google Maps JavaScript API";
      const c = "google";
      const l = "importLibrary";
      const q = "__ib__";
      const m = document;
      let b = window;
      b = b[c] || (b[c] = {});
      const d = b.maps || (b.maps = {});
      const r = new Set();
      const e = new URLSearchParams();
      const u = () =>
        h ||
        (h = new Promise(async (f, n) => {
          await (a = m.createElement("script"));
          e.set("libraries", [...r] + "");
          for (k in g) e.set(k.replace(/[A-Z]/g, (t) => `_${t[0].toLowerCase()}`), g[k]);
          e.set("callback", `${c}.maps.${q}`);
          a.src = `https://maps.${c}apis.com/maps/api/js?${e}`;
          d[q] = f;
          a.onerror = () => {
            h = n(new Error(`${p} could not load.`));
          };
          a.nonce = m.querySelector("script[nonce]")?.nonce || "";
          m.head.append(a);
        }));
      d[l] ? console.warn(`${p} only loads once. Ignoring:`, g) : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
    })({ key: googleMapsApiKey, v: "weekly" });
  }

  return window.google;
}
