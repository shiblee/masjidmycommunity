import React from "react";
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

export function excerpt(text, max = 140) {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max).trim()}…` : trimmed;
}
