import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "msj-map-pin",
  html: '<span class="msj-map-pin-dot"></span><span class="msj-map-pin-pulse"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Read-only map showing where a masjid is, used on public and admin views. */
function StaticLocationMap({ latitude, longitude, height = 260, zoom = 16 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (latitude == null || longitude == null || mapRef.current || !containerRef.current) return;

    const position = [Number(latitude), Number(longitude)];
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(position, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.marker(position, { icon: pinIcon }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude, zoom]);

  if (latitude == null || longitude == null) return null;

  return (
    <div className="msj-map-canvas-wrap" style={{ marginTop: 20 }}>
      <div ref={containerRef} className="msj-map-canvas" style={{ height }} />
    </div>
  );
}

export default StaticLocationMap;
