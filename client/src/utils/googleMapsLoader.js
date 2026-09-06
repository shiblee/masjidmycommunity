let loadPromise = null;

export function loadGoogleMaps() {
  // `google.maps.places`/`.geocoding` are populated by importLibrary() on
  // demand, not by this script tag itself — so the readiness check here is
  // just "is the base loader present," not "are the libraries imported."
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return Promise.reject(new Error("Google Maps API key is not configured."));

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // No `libraries=` param — Places API (New) and Geocoding are loaded on
    // demand via `google.maps.importLibrary(...)`, not the classic bundle
    // param. `v=weekly` tracks current Maps JS releases; `loading=async`
    // matches Google's current guidance for importLibrary-based loading.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Couldn't load Google Maps."));
    document.head.appendChild(script);
  });

  return loadPromise;
}
