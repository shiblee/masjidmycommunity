import { loadGoogleMaps, getMapSettings } from "./googleMapsLoader.js";

// Google is preferred when its key is configured (admin Settings, falling
// back to the build-time env var) AND billing/APIs are active on the Cloud
// project. When either is missing it fails fast, and we fall back to the
// keyless OpenStreetMap/Nominatim geocoder so address search always works.
// Optimistic until loadGoogleMaps()/a Google call actually fails — the key
// itself isn't known synchronously anymore since it may come from the
// backend, so there's nothing meaningful to check up front.
let googleUsable = true;

let placesLib = null; // { AutocompleteSuggestion, AutocompleteSessionToken }
let geocoder = null;
let sessionToken = null;

function disableGoogle() {
  googleUsable = false;
  placesLib = null;
  geocoder = null;
}

async function ensureGoogleServices() {
  if (!googleUsable) return null;
  try {
    const google = await loadGoogleMaps();
    // Google calls this global when the key is rejected — including the
    // BillingNotEnabledMapError case. A specific API (e.g. Places (New))
    // not being enabled on the project surfaces as a rejected promise from
    // importLibrary/fetch calls instead, which the try/catch below covers.
    window.gm_authFailure = disableGoogle;
    if (!placesLib) {
      placesLib = await google.maps.importLibrary("places");
      geocoder = new (await google.maps.importLibrary("geocoding")).Geocoder();
      sessionToken = new placesLib.AutocompleteSessionToken();
    }
    return google;
  } catch {
    disableGoogle();
    return null;
  }
}

async function searchGoogle(query) {
  const google = await ensureGoogleServices();
  if (!google) return null;

  try {
    const { addressCountry } = await getMapSettings();
    const request = { input: query, sessionToken };
    if (addressCountry) request.includedRegionCodes = [addressCountry.toUpperCase()];

    const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    // An empty array is a valid "no matches" result, not a failure — only a
    // thrown/rejected call (caught below) means Google itself is unusable.
    return suggestions
      .filter((s) => s.placePrediction)
      .map((s) => {
        const p = s.placePrediction;
        return {
          id: p.placeId,
          primary: p.mainText?.text || p.text?.text || "",
          secondary: p.secondaryText?.text || "",
          label: p.text?.text || "",
          source: "google",
          placePrediction: p,
        };
      });
  } catch {
    disableGoogle();
    return null;
  }
}

/** Classic Geocoding API result shape (`address_components`/`long_name`) — used only by reverseGoogle, which stays on the classic Geocoder since Places API (New) has no reverse-geocoding endpoint. */
function geocoderResultToFields(place) {
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

/** Places API (New) `Place` shape (`addressComponents`/`longText`, no `.geometry` wrapper) — used only by resolveGoogle. */
function placeToFields(place) {
  const components = place.addressComponents || [];
  const get = (type) => components.find((c) => c.types.includes(type))?.longText || "";
  const street = [get("street_number"), get("route")].filter(Boolean).join(" ");
  const placeName = place.displayName && place.displayName !== street ? place.displayName : "";

  return {
    address: [placeName, street].filter(Boolean).join(", ") || place.formattedAddress || "",
    formattedAddress: place.formattedAddress || "",
    area: get("sublocality_level_1") || get("sublocality") || get("neighborhood") || "",
    city: get("locality") || get("postal_town") || "",
    district: get("administrative_area_level_2") || "",
    state: get("administrative_area_level_1") || "",
    country: get("country") || "",
    postalCode: get("postal_code") || "",
    latitude: place.location?.lat() ?? null,
    longitude: place.location?.lng() ?? null,
    mapLink: place.googleMapsURI || "",
    placeId: place.id || "",
  };
}

async function resolveGoogle(suggestion) {
  const google = await ensureGoogleServices();
  if (!google || !suggestion.placePrediction) return null;

  try {
    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "addressComponents", "location", "googleMapsURI"] });
    // A new token must be issued once a session ends with a details call.
    sessionToken = new placesLib.AutocompleteSessionToken();
    return placeToFields(place);
  } catch {
    disableGoogle();
    return null;
  }
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
      const fields = geocoderResultToFields(results[0]);
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
  const { addressCountry } = await getMapSettings();
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    namedetails: "1",
    limit: "6",
    q: query,
  });
  if (addressCountry) params.set("countrycodes", addressCountry);
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
