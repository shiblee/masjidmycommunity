import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_ORIGIN } from "../../config.js";
import { loadClusterPlugin } from "../../utils/loadMarkerCluster.js";
import { locationOf, distanceToMasjid, formatDistance, directionsUrl, GetDirectionsButton } from "./exploreMasjidsShared.jsx";

// Same path data as Icons.jsx's "compass" — hand-embedded because this
// popup is raw HTML (a Leaflet popup, outside the React tree).
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

function popupHtml(m, distanceLabel) {
  const cover = m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null;
  const url = directionsUrl(m);
  // Two sibling <a> tags, not nested — an <a> can't validly contain another <a>,
  // and since this is raw HTML (a Leaflet popup, outside React) the browser would
  // silently mangle the nesting rather than React catching it.
  return `
    <div class="msj-map-popup">
      <a href="/masjid/${m.id}" class="msj-map-popup-linkarea">
        ${cover ? `<img src="${cover}" alt="" class="msj-map-popup-thumb" />` : ""}
        <div class="msj-map-popup-body">
          <h4>${m.name}</h4>
          <div class="msj-map-popup-meta">
            ${m.category ? `<span class="msj-category-badge">${m.category}</span>` : ""}
          </div>
          <p>${locationOf(m)}</p>
          ${distanceLabel ? `<p class="msj-map-popup-distance">📍 ${distanceLabel} from you</p>` : ""}
        </div>
      </a>
      ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="msj-directions-btn msj-map-popup-directions">${COMPASS_SVG} Get Directions</a>` : ""}
    </div>
  `;
}

function ExploreMasjidsMap({ masjids, selectedId, onSelect, userLocation, onLocateMe }) {
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
      const distance = distanceToMasjid(userLocationRef.current, m);
      marker.bindPopup(popupHtml(m, distance != null ? formatDistance(distance) : null));
      marker.on("click", () => onSelectRef.current?.(m.id));
      cluster.addLayer(marker);
      markersById.current.set(m.id, marker);
    });

    cluster.addTo(map);
    clusterRef.current = cluster;

    const boundPoints = mapped.map((m) => [Number(m.latitude), Number(m.longitude)]);
    if (userLocationRef.current) boundPoints.push([userLocationRef.current.lat, userLocationRef.current.lng]);

    if (boundPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundPoints), { padding: [40, 40], maxZoom: 15 });
    } else if (boundPoints.length === 1) {
      map.setView(boundPoints[0], 15);
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [masjids, pluginReady]);

  // "You are here" marker — kept separate from the cluster group (a user's own
  // location shouldn't cluster with masjid pins) and re-added whenever it moves.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (!userLocation) return;
    const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 });
    marker.bindPopup('<div class="msj-map-popup"><div class="msj-map-popup-body"><h4>You are here</h4></div></div>');
    marker.addTo(map);
    userMarkerRef.current = marker;
  }, [userLocation]);

  // Left-panel item selected (or a marker clicked, which also sets selectedId) —
  // fly the map to it, open its popup, and scroll the matching panel item into view.
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
        {masjids.length === 0 && <p className="msj-explore-map-empty">No masjids match your search.</p>}
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
              <h4>{m.name}</h4>
              <p><Icon name="mapPin" size={12} /> {locationOf(m)}</p>
              {(m.latitude == null || m.longitude == null) && <span className="msj-explore-map-item-flag">Not mapped yet</span>}
              {(() => {
                const d = distanceToMasjid(userLocation, m);
                return d != null && <span className="msj-explore-map-item-distance">{formatDistance(d)}</span>;
              })()}
            </div>
            <GetDirectionsButton m={m} className="msj-explore-map-item-link" />
          </button>
        ))}
      </div>
      <div className="msj-map-canvas-wrap msj-explore-map-canvas-wrap">
        <div ref={containerRef} className="msj-map-canvas msj-explore-map-canvas" />
        <button type="button" className="msj-locate-me-btn" onClick={onLocateMe} title="Show my location">
          <Icon name="mapPin" size={16} />
        </button>
      </div>
    </div>
  );
}

export default ExploreMasjidsMap;
