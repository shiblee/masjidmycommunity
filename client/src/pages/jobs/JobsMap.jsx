import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Icon } from "../../components/Icons.jsx";
import { loadClusterPlugin } from "../../utils/loadMarkerCluster.js";
import { distanceToJob, formatDistance, jobDirectionsUrl } from "../../components/job/jobLocationUtils.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// Same hand-embedded SVG-string approach as ExploreMasjidsMap.jsx — this
// popup is raw HTML (a Leaflet popup, outside the React tree), so it can't
// mount <Icon> directly.
const COMPASS_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M15.5 8.5l-2 5-5 2 2-5z"></path></svg>';

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 4;

const pinIcon = L.divIcon({
  className: "msj-map-pin",
  html: '<span class="msj-map-pin-dot"></span><span class="msj-map-pin-pulse"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 25],
});

const userIcon = L.divIcon({
  className: "msj-map-user-pin",
  html: '<span class="msj-map-user-dot"></span><span class="msj-map-user-pulse"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function popupHtml(j, distanceLabel, t) {
  const url = jobDirectionsUrl(j);
  const fromYouLabel = t("jobs.map.fromYou", "from you");
  const getDirectionsLabel = t("jobs.card.getDirections", "Get Directions");
  return `
    <div class="msj-map-popup">
      <a href="/job/${j.slug}" class="msj-map-popup-linkarea">
        <div class="msj-map-popup-body">
          <h4>${j.title}</h4>
          <div class="msj-map-popup-meta">
            <span class="msj-category-badge">${j.jobType}</span>
          </div>
          <p>${j.location}</p>
          ${distanceLabel ? `<p class="msj-map-popup-distance">📍 ${distanceLabel} ${fromYouLabel}</p>` : ""}
        </div>
      </a>
      ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="msj-directions-btn msj-map-popup-directions">${COMPASS_SVG} ${getDirectionsLabel}</a>` : ""}
    </div>
  `;
}

// Leaner adaptation of ExploreMasjidsMap.jsx for jobs — same clustering/
// user-pin/fit-bounds mechanics, without the photo/rating/Green-Tick
// engagement chrome jobs don't have.
function JobsMap({ jobs, selectedId, onSelect, userLocation, onLocateMe }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersById = useRef(new Map());
  const itemRefs = useRef(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;

  const [pluginReady, setPluginReady] = useState(false);

  const mapped = jobs.filter((j) => j.latitude != null && j.longitude != null);

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

    mapped.forEach((j) => {
      const marker = L.marker([Number(j.latitude), Number(j.longitude)], { icon: pinIcon });
      const distance = distanceToJob(userLocationRef.current, j);
      marker.bindPopup(popupHtml(j, distance != null ? formatDistance(distance) : null, t));
      marker.on("click", () => onSelectRef.current?.(j.id));
      cluster.addLayer(marker);
      markersById.current.set(j.id, marker);
    });

    cluster.addTo(map);
    clusterRef.current = cluster;

    const boundPoints = mapped.map((j) => [Number(j.latitude), Number(j.longitude)]);
    if (userLocationRef.current) boundPoints.push([userLocationRef.current.lat, userLocationRef.current.lng]);

    if (boundPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundPoints), { padding: [40, 40], maxZoom: 15 });
    } else if (boundPoints.length === 1) {
      map.setView(boundPoints[0], 15);
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [jobs, pluginReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (!userLocation) return;
    const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 });
    marker.bindPopup(`<div class="msj-map-popup"><div class="msj-map-popup-body"><h4>${t("jobs.map.youAreHere", "You are here")}</h4></div></div>`);
    marker.addTo(map);
    userMarkerRef.current = marker;
  }, [userLocation]);

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
        {jobs.length === 0 && <p className="msj-explore-map-empty">{t("jobs.map.noMatch", "No jobs match your search.")}</p>}
        {jobs.map((j) => (
          <button
            type="button"
            key={j.id}
            ref={(el) => { if (el) itemRefs.current.set(j.id, el); else itemRefs.current.delete(j.id); }}
            className={`msj-explore-map-item ${selectedId === j.id ? "active" : ""}`}
            onClick={() => onSelect(j.id)}
          >
            <div className="msj-explore-map-item-body">
              <h4>{j.title}</h4>
              <p><Icon name="mapPin" size={12} /> {j.location}</p>
              {(j.latitude == null || j.longitude == null) && <span className="msj-explore-map-item-flag">{t("jobs.map.notMappedYet", "Not mapped yet")}</span>}
              {(() => {
                const d = distanceToJob(userLocation, j);
                return d != null && <span className="msj-explore-map-item-distance">{formatDistance(d)}</span>;
              })()}
            </div>
          </button>
        ))}
      </div>
      <div className="msj-map-canvas-wrap msj-explore-map-canvas-wrap">
        <div ref={containerRef} className="msj-map-canvas msj-explore-map-canvas" />
        <button type="button" className="msj-locate-me-btn" onClick={onLocateMe} title={t("jobs.map.showMyLocation", "Show my location")}>
          <Icon name="mapPin" size={16} />
        </button>
      </div>
    </div>
  );
}

export default JobsMap;
