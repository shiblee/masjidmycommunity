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
import { STATUS_LABEL, locationOf, EDITABLE } from "./myMasjidsShared.jsx";

const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_ZOOM = 4;

const pinIcon = L.divIcon({
  className: "msj-map-pin",
  html: '<span class="msj-map-pin-dot"></span><span class="msj-map-pin-pulse"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 25],
});

function popupHtml(m) {
  const cover = m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null;
  return `
    <div class="msj-map-popup">
      ${cover ? `<img src="${cover}" alt="" class="msj-map-popup-thumb" />` : ""}
      <div class="msj-map-popup-body">
        <h4>${m.name}</h4>
        <div class="msj-map-popup-meta">
          ${m.category ? `<span class="msj-category-badge">${m.category}</span>` : ""}
          <span class="acct-status-pill ${m.status}">${STATUS_LABEL[m.status]}</span>
        </div>
        <p>${locationOf(m)}</p>
        <a href="/account/my-masjids/${m.id}">${EDITABLE.has(m.status) ? "Edit" : "View Details"} →</a>
      </div>
    </div>
  `;
}

function MyMasjidsMap({ masjids, selectedId, onSelect }) {
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
      marker.bindPopup(popupHtml(m));
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
  }, [masjids, pluginReady]);

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
              <span className={`acct-status-pill ${m.status}`}>{STATUS_LABEL[m.status]}</span>
              {(m.latitude == null || m.longitude == null) && <span className="msj-explore-map-item-flag">Not mapped yet</span>}
            </div>
            <Link to={`/account/my-masjids/${m.id}`} onClick={(e) => e.stopPropagation()} className="msj-explore-map-item-link">
              {EDITABLE.has(m.status) ? "Edit" : "View Details"}
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
