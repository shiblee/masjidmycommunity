import { distanceKm, formatDistance } from "../../pages/exploreMasjids/exploreMasjidsShared.jsx";

export { formatDistance };

/** Distance from `coords` ({lat,lng}) to a job with lat/lng fields, or null if either is missing. */
export function distanceToJob(coords, job) {
  if (!coords || job.latitude == null || job.longitude == null) return null;
  return distanceKm(coords.lat, coords.lng, Number(job.latitude), Number(job.longitude));
}

/** Opens the platform's own maps app/site for directions, same handoff
 * pattern as exploreMasjidsShared.jsx's directionsUrl. */
export function jobDirectionsUrl(job) {
  if (job.latitude == null || job.longitude == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`;
}
