import { loadGoogleMaps } from "./googleMapsLoader.js";

// Google is preferred when its key is configured AND billing is active on the
// Cloud project. When either is missing it fails fast, and we fall back to the
// keyless OpenStreetMap/Nominatim geocoder so address search always works.
let googleUsable = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

// Restricting search to a country keeps a partial local address (e.g. a Lucknow
// street) from fuzzy-matching a similarly spelled place on another continent.
// Blank the env var to search worldwide.
const COUNTRY = (import.meta.env.VITE_ADDRESS_COUNTRY ?? "in").trim().toLowerCase();
let autocompleteService = null;
let placesService = null;
let geocoder = null;
let sessionToken = null;

function disableGoogle() {
  googleUsable = false;
  autocompleteService = null;
  placesService = null;
  geocoder = null;
}

async function ensureGoogleServices() {
  if (!googleUsable) return null;
  const google = await loadGoogleMaps();
  // Google calls this global when the key is rejected — including the
  // BillingNotEnabledMapError case.
  window.gm_authFailure = disableGoogle;
  if (!autocompleteService) {
    autocompleteService = new google.maps.places.AutocompleteService();
    placesService = new google.maps.places.PlacesService(document.createElement("div"));
    geocoder = new google.maps.Geocoder();
    sessionToken = new google.maps.places.AutocompleteSessionToken();
  }
  return google;
}

async function searchGoogle(query) {
  const google = await ensureGoogleServices();
  if (!google) return null;

  const request = { input: query, sessionToken };
  if (COUNTRY) request.componentRestrictions = { country: COUNTRY };

  return new Promise((resolve) => {
    autocompleteService.getPlacePredictions(request, (predictions, status) => {
      const { OK, ZERO_RESULTS } = google.maps.places.PlacesServiceStatus;
      if (status === ZERO_RESULTS) return resolve([]);
      if (status !== OK || !predictions) {
        disableGoogle();
        return resolve(null);
      }
      resolve(
        predictions.map((p) => ({
          id: p.place_id,
          primary: p.structured_formatting?.main_text || p.description,
          secondary: p.structured_formatting?.secondary_text || "",
          label: p.description,
          source: "google",
        }))
      );
    });
  });
}

function googleComponentsToFields(place) {
  const components = place.address_components || [];
  const get = (type) => components.find((c) => c.types.includes(type))?.long_name || "";
  const street = [get("street_number"), get("route")].filter(Boolean).join(" ");
  // Keep the place's own name (e.g. "Jama Masjid") ahead of the street it sits
  // on — the name is what identifies the masjid, the road only locates it.
  const placeName = place.name && place.name !== street ? place.name : "";

  return {
    address: [placeName, street].filter(Boolean).join(", ") || place.formatted_address || "",
    formattedAddress: place.formatted_address || "",
    area: get("sublocality_level_1") || get("sublocality") || get("neighborhood") || "",
    city: get("locality") || get("postal_town") || "",
    district: get("administrative_area_level_2") || "",
    state: get("administrative_area_level_1") || "",
    country: get("country") || "",
    postalCode: get("postal_code") || "",
    latitude: place.geometry?.location?.lat() ?? null,
    longitude: place.geometry?.location?.lng() ?? null,
    mapLink: place.url || "",
  };
}

async function resolveGoogle(suggestion) {
  const google = await ensureGoogleServices();
  if (!google) return null;

  return new Promise((resolve) => {
    placesService.getDetails(
      { placeId: suggestion.id, fields: ["name", "address_components", "formatted_address", "url", "geometry"], sessionToken },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          disableGoogle();
          return resolve(null);
        }
        // A new token must be issued once a session ends with a details call.
        sessionToken = new google.maps.places.AutocompleteSessionToken();
        resolve(googleComponentsToFields(place));
      }
    );
  });
}

async function reverseGoogle(lat, lon) {
  const google = await ensureGoogleServices();
  if (!google) return null;

  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng: lon } }, (results, status) => {
      if (status !== "OK" || !results?.length) {
        disableGoogle();
        return resolve(null);
      }
      const fields = googleComponentsToFields(results[0]);
      resolve({ ...fields, latitude: lat, longitude: lon });
    });
  });
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

function osmMapLink(lat, lon) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

function osmToFields(r) {
  const a = r.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  // r.name holds the POI's own name when the result is a place rather than a
  // plain street address; prefer it so "Jama Masjid" isn't replaced by its road.
  const placeName = r.name && r.name !== a.road ? r.name : "";

  return {
    address: [placeName, street].filter(Boolean).join(", ") || r.display_name?.split(",")[0] || "",
    formattedAddress: r.display_name || "",
    area: a.suburb || a.neighbourhood || a.city_district || a.hamlet || a.village || "",
    city: a.city || a.town || a.municipality || a.village || "",
    district: a.state_district || a.county || "",
    state: a.state || a.region || "",
    country: a.country || "",
    postalCode: a.postcode || "",
    latitude: r.lat != null ? Number(r.lat) : null,
    longitude: r.lon != null ? Number(r.lon) : null,
    mapLink: r.lat != null ? osmMapLink(r.lat, r.lon) : "",
  };
}

async function searchNominatim(query, signal) {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    namedetails: "1",
    limit: "6",
    q: query,
  });
  if (COUNTRY) params.set("countrycodes", COUNTRY);
  const response = await fetch(`${NOMINATIM}/search?${params}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Address search is unavailable right now.");
  const results = await response.json();

  return results.map((r) => {
    const parts = (r.display_name || "").split(", ");
    return {
      id: `${r.osm_type}-${r.osm_id}`,
      primary: r.name || parts[0] || r.display_name,
      secondary: (r.name ? parts : parts.slice(1)).join(", "),
      label: r.display_name,
      source: "osm",
      raw: r,
    };
  });
}

async function reverseNominatim(lat, lon, signal) {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    namedetails: "1",
    lat: String(lat),
    lon: String(lon),
  });
  const response = await fetch(`${NOMINATIM}/reverse?${params}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Couldn't look up that location.");
  const result = await response.json();
  // The pin the user placed is the source of truth, not the matched feature's
  // own centre point.
  return { ...osmToFields(result), latitude: lat, longitude: lon, mapLink: osmMapLink(lat, lon) };
}

// Loading the Maps script and having it reject the key takes seconds. Cap the
// wait so a misconfigured Google account never stalls the first search.
const GOOGLE_TIMEOUT_MS = 2500;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("google-timeout")), ms)),
  ]);
}

/** Returns suggestions from Google when available, otherwise from OpenStreetMap. */
export async function searchAddresses(query, signal) {
  if (googleUsable) {
    try {
      const googleResults = await withTimeout(searchGoogle(query), GOOGLE_TIMEOUT_MS);
      if (googleResults) return googleResults;
    } catch {
      disableGoogle();
    }
  }
  return searchNominatim(query, signal);
}

/** Expands a suggestion into the individual address fields the form needs. */
export async function resolveAddress(suggestion) {
  if (suggestion.source === "google") {
    const resolved = await resolveGoogle(suggestion);
    if (resolved) return resolved;
    return { address: suggestion.label };
  }
  return osmToFields(suggestion.raw);
}

/** Turns a dropped/dragged map pin back into address fields. */
export async function reverseGeocode(lat, lon, signal) {
  if (googleUsable) {
    try {
      const resolved = await withTimeout(reverseGoogle(lat, lon), GOOGLE_TIMEOUT_MS);
      if (resolved) return resolved;
    } catch {
      disableGoogle();
    }
  }
  return reverseNominatim(lat, lon, signal);
}
