import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_ORIGIN } from "../../config.js";
import { loadClusterPlugin } from "../../utils/loadMarkerCluster.js";
import { buildStatusLabel, locationOf, EDITABLE } from "./myMasjidsShared.jsx";
import EngagementRow from "../../components/masjid/EngagementRow.jsx";
import GreenTickBadge from "../../components/masjid/GreenTickBadge.jsx";
import { formatCompactNumber } from "../../utils/formatCompactNumber.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 4;

const pinIcon = L.divIcon({
  className: "msj-map-pin",
  html: '<span class="msj-map-pin-dot"></span><span class="msj-map-pin-pulse"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 25],
});

// Same shapes as Icons.jsx's "heart" and the star used elsewhere — hand-
// embedded because this popup is raw HTML (a Leaflet popup, outside React).
const HEART_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.8 4 5.2c2-1.2 4.4-.6 5.7 1 .7.8 1.4 1.8 2.3 1.8s1.6-1 2.3-1.8c1.3-1.6 3.7-2.2 5.7-1 2.6 1.6 3.2 4.9 1.3 7.7C18.7 16.65 12 21 12 21z"></path></svg>';
const STAR_SVG_FILLED =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="#F5A623" stroke="none"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"></path></svg>';
// Matches GreenTickBadge.jsx's own filled-checkmark-disc mark — a plain,
// non-interactive version here since this popup is raw HTML, not React.
const SHIELD_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#5E9A2C"></circle><path d="M7 12.5l3.3 3.3L17 8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>';

function popupHtml(m, t, statusLabel) {
  const cover = m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null;
  const engagementParts = [];
  if (m.status === "approved") {
    if (m.likeCount) engagementParts.push(`${HEART_SVG} ${formatCompactNumber(m.likeCount)}`);
    if (m.reviewCount) engagementParts.push(`${STAR_SVG_FILLED} ${Number(m.avgRating).toFixed(1)}`);
  }
  const engagementHtml = engagementParts.length
    ? `<p class="msj-map-popup-engagement">${engagementParts.join('<span class="msj-map-popup-engagement-dot">·</span>')}</p>`
    : "";
  return `
    <div class="msj-map-popup">
      ${cover ? `<img src="${cover}" alt="" class="msj-map-popup-thumb" />` : ""}
      <div class="msj-map-popup-body">
        <h4>${m.name}${m.isGreenTick ? ` <span class="msj-map-popup-greentick" title="${t("exploreMasjidsPage.map.verified", "Verified")}">${SHIELD_SVG}</span>` : ""}</h4>
        <div class="msj-map-popup-meta">
          ${m.category ? `<span class="msj-category-badge">${m.category}</span>` : ""}
          <span class="acct-status-pill ${m.status}">${statusLabel[m.status]}</span>
        </div>
        <p>${locationOf(m, t)}</p>
        ${engagementHtml}
        <a href="/account/my-masjids/${m.id}">${EDITABLE.has(m.status) ? t("masjidWizard.summary.edit", "Edit") : t("myMasjidsShared.viewDetails", "View Details")} →</a>
      </div>
    </div>
  `;
}

function MyMasjidsMap({ masjids, selectedId, onSelect }) {
  const { t } = useTranslation();
  const STATUS_LABEL = buildStatusLabel(t);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const markersById = useRef(new Map());
  const itemRefs = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [pluginReady, setPluginReady] = useState(false);

  const mapped = masjids.filter((m) => m.latitude != null && m.longitude != null);

  useEffect(() => {
    loadClusterPlugin().then(() => setPluginReady(true));
  }, []);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pluginReady) return;

    if (clusterRef.current) map.removeLayer(clusterRef.current);
    const cluster = L.markerClusterGroup({ maxClusterRadius: 50 });
    markersById.current = new Map();

    mapped.forEach((m) => {
      const marker = L.marker([Number(m.latitude), Number(m.longitude)], { icon: pinIcon });
      marker.bindPopup(popupHtml(m, t, STATUS_LABEL));
      marker.on("click", () => onSelectRef.current?.(m.id));
      cluster.addLayer(marker);
      markersById.current.set(m.id, marker);
    });

    cluster.addTo(map);
    clusterRef.current = cluster;

    if (mapped.length > 1) {
      map.fitBounds(L.latLngBounds(mapped.map((m) => [Number(m.latitude), Number(m.longitude)])), { padding: [40, 40], maxZoom: 15 });
    } else if (mapped.length === 1) {
      map.setView([Number(mapped[0].latitude), Number(mapped[0].longitude)], 15);
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [masjids, pluginReady, t]);

  useEffect(() => {
    if (!selectedId) return;
    const map = mapRef.current;
    const marker = markersById.current.get(selectedId);
    if (map && marker) {
      const cluster = clusterRef.current;
      cluster?.zoomToShowLayer(marker, () => {
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15));
        marker.openPopup();
      });
    }
    itemRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <div className="msj-explore-map-layout">
      <div className="msj-explore-map-panel">
        {masjids.length === 0 && <p className="msj-explore-map-empty">{t("exploreMasjidsPage.map.noMatch", "No masjids match your search.")}</p>}
        {masjids.map((m) => (
          <button
            type="button"
            key={m.id}
            ref={(el) => { if (el) itemRefs.current.set(m.id, el); else itemRefs.current.delete(m.id); }}
            className={`msj-explore-map-item ${selectedId === m.id ? "active" : ""}`}
            onClick={() => onSelect(m.id)}
          >
            <div className="msj-explore-map-item-thumb">
              <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
            </div>
            <div className="msj-explore-map-item-body">
              <span className="msj-card-title-row">
                <h4>{m.name}</h4>
                <GreenTickBadge masjid={m} variant="map" />
              </span>
              <p><Icon name="mapPin" size={12} /> {locationOf(m, t)}</p>
              <span className={`acct-status-pill ${m.status}`}>{STATUS_LABEL[m.status]}</span>
              {(m.latitude == null || m.longitude == null) && <span className="msj-explore-map-item-flag">{t("exploreMasjidsPage.map.notMappedYet", "Not mapped yet")}</span>}
              {m.status === "approved" && <EngagementRow masjid={m} variant="map" />}
            </div>
            <Link to={`/account/my-masjids/${m.id}`} onClick={(e) => e.stopPropagation()} className="msj-explore-map-item-link">
              {EDITABLE.has(m.status) ? t("masjidWizard.summary.edit", "Edit") : t("myMasjidsShared.viewDetails", "View Details")}
            </Link>
          </button>
        ))}
      </div>
      <div className="msj-map-canvas-wrap msj-explore-map-canvas-wrap">
        <div ref={containerRef} className="msj-map-canvas msj-explore-map-canvas" />
      </div>
    </div>
  );
}

export default MyMasjidsMap;
