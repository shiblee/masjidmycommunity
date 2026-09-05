import React, { useState } from "react";
import { Icon } from "../../components/Icons.jsx";

export function locationOf(m) {
  return [m.city, m.country].filter(Boolean).join(", ") || "Location not set";
}

/** Great-circle distance in km between two lat/lng points. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const NEARBY_RADIUS_KM = 25;

/** "850 m away" below 1km, else "3.2 km away". */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

/** Distance from `coords` ({lat,lng}) to a masjid with lat/lng fields, or null if either is missing. */
export function distanceToMasjid(coords, m) {
  if (!coords || m.latitude == null || m.longitude == null) return null;
  return distanceKm(coords.lat, coords.lng, Number(m.latitude), Number(m.longitude));
}

export function VerifiedTick({ inline = false }) {
  return (
    <span className={`msj-verified-badge ${inline ? "inline" : ""}`}>
      <Icon name="shieldCheck" size={13} /> Verified
    </span>
  );
}

export function ActiveCampaignBadge({ m }) {
  if (!m.activeCampaignCount) return null;
  return (
    <span className="msj-active-campaign-badge">
      <Icon name="heart" size={12} /> {m.activeCampaignCount} active campaign{m.activeCampaignCount > 1 ? "s" : ""}
    </span>
  );
}

export function DistanceBadge({ userLocation, m }) {
  const d = distanceToMasjid(userLocation, m);
  if (d == null) return null;
  return <span className="msj-distance-badge"><Icon name="mapPin" size={11} /> {formatDistance(d)}</span>;
}

/** Opens the platform's own maps app/site for directions — it handles the
 * user's current-location permission and fallback UI natively (exactly the
 * "Your location" flow shown in Google Maps), so no in-app geolocation
 * dance is needed here — just hand off to it with the destination set. */
export function directionsUrl(m) {
  if (m.latitude == null || m.longitude == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`;
}

export function GetDirectionsButton({ m, className = "" }) {
  const url = directionsUrl(m);
  if (!url) {
    return (
      <span className={`msj-directions-btn disabled ${className}`} title="Location not set for this masjid">
        <Icon name="compass" size={16} />
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`msj-directions-btn ${className}`}
      title="Get Directions"
      onClick={(e) => e.stopPropagation()}
    >
      <Icon name="compass" size={16} />
    </a>
  );
}

const STAR_PATH = "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z";
const STAR_COLOR = "#F5A623";

function StarIcon({ filled, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? STAR_COLOR : "none"} stroke={filled ? STAR_COLOR : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={STAR_PATH} />
    </svg>
  );
}

/** Read-only when `onChange` is omitted; a clickable 1-5 input (with hover preview) otherwise. `value` may be fractional for display (rounded to the nearest star). */
export function StarRating({ value = 0, onChange, size = 16 }) {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  return (
    <span className={`msj-star-rating ${onChange ? "interactive" : ""}`} onMouseLeave={() => setHover(0)}>
      {stars.map((n) =>
        onChange ? (
          <button
            type="button"
            key={n}
            className="msj-star-btn"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <StarIcon filled={n <= (hover || value)} size={size} />
          </button>
        ) : (
          <StarIcon key={n} filled={n <= Math.round(value)} size={size} />
        )
      )}
    </span>
  );
}

/** Compact "4.4 (119)" chip used on Grid/List/Map-panel — clickable to jump straight to a masjid's Reviews tab. */
export function RatingChip({ m, onClick }) {
  if (!m.reviewCount) return null;
  return (
    <button type="button" className="msj-rating-chip" onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <StarIcon filled size={12} /> {Number(m.avgRating).toFixed(1)} <span className="msj-rating-chip-count">({m.reviewCount})</span>
    </button>
  );
}

export function excerpt(text, max = 140) {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max).trim()}…` : trimmed;
}
