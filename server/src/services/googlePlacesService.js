import MapSettings from "../models/MapSettings.js";

// Reuses the site's existing Google Maps API key (Settings → Google Maps)
// for server-side Places API (New) calls — confirmed working directly
// against Google's Text Search endpoint with this exact key, so no second,
// separate server-side key is needed. If that key is ever removed/rotated
// without Places API (New) enabled on it, these calls will start failing
// with a clear Google-side error, surfaced through masjidBotSchedulerService.js's
// lastError the same way any other failure is.
async function getApiKey() {
  const settings = await MapSettings.findByPk(1);
  const key = settings?.googleMapsApiKey;
  if (!key) throw new Error("No Google Maps API key configured (Settings → Google Maps).");
  return key;
}

const PLACES_BASE = "https://places.googleapis.com/v1";

/** Text Search (New) — used for discovery, one query per search center. */
export async function searchMosques({ query, lat, lng, radiusMeters = 20000 }) {
  const key = await getApiKey();
  const body = {
    textQuery: query,
    includedType: "mosque",
    locationBias: {
      circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
    },
  };
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places Text Search failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.places || [];
}

/** Place Details (New) — richer fields for a specific candidate once it's
 * passed duplicate detection, so details are only fetched for places
 * actually worth importing (keeps API spend proportional to real imports). */
export async function getPlaceDetails(placeId) {
  const key = await getApiKey();
  const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": [
        "id", "displayName", "formattedAddress", "addressComponents", "location",
        "internationalPhoneNumber", "websiteUri", "types", "photos",
      ].join(","),
    },
  });
  if (!res.ok) throw new Error(`Place Details failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Builds the URL masjidPhotoProxyController.js uses to stream a photo
 * from Google at request time — never downloaded/stored on this server. */
export async function buildPhotoMediaUrl(photoResourceName, maxWidthPx = 1200) {
  const key = await getApiKey();
  return `${PLACES_BASE}/${photoResourceName}/media?maxWidthPx=${maxWidthPx}&key=${key}`;
}
