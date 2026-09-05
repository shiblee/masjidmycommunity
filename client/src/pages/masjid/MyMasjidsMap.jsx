import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "../../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import { STATUS_LABEL, locationOf } from "./myMasjidsShared.jsx";

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
        <a href="/account/my-masjids/${m.id}">View Details →</a>
      </div>
    </div>
  `;
}

function MyMasjidsMap({ masjids }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const mapped = masjids.filter((m) => m.latitude != null && m.longitude != null);
  const unmapped = masjids.filter((m) => m.latitude == null || m.longitude == null);

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
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = mapped.map((m) => {
      const marker = L.marker([Number(m.latitude), Number(m.longitude)], { icon: pinIcon }).addTo(map);
      marker.bindPopup(popupHtml(m));
      return marker;
    });

    if (mapped.length > 1) {
      map.fitBounds(L.latLngBounds(mapped.map((m) => [Number(m.latitude), Number(m.longitude)])), { padding: [40, 40], maxZoom: 15 });
    } else if (mapped.length === 1) {
      map.setView([Number(mapped[0].latitude), Number(mapped[0].longitude)], 15);
    } else {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
    setTimeout(() => map.invalidateSize(), 60);
  }, [masjids]);

  return (
    <div>
      <div className="msj-map-canvas-wrap">
        <div ref={containerRef} className="msj-map-canvas msj-mymasjids-map" />
      </div>
      {unmapped.length > 0 && (
        <div className="msj-map-unmapped">
          <Icon name="mapPin" size={15} />
          <span>
            {unmapped.length} masjid{unmapped.length > 1 ? "s aren't" : " isn't"} mapped yet (no address set):{" "}
            {unmapped.map((m, i) => (
              <React.Fragment key={m.id}>
                {i > 0 && ", "}
                <Link to={`/account/my-masjids/${m.id}`}>{m.name}</Link>
              </React.Fragment>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

export default MyMasjidsMap;
