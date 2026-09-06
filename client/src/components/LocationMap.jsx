import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { reverseGeocode } from "../utils/addressProviders.js";
import Icon from "./Icons.jsx";

const DEFAULT_CENTER = [20.5937, 78.9629]; // India, used until a place is chosen
const DEFAULT_ZOOM = 4;
const PLACED_ZOOM = 17;

// Leaflet's bundled marker images don't survive bundling; a divIcon keeps the
// pin self-contained and lets it follow the site's palette.
const pinIcon = L.divIcon({
  className: "msj-map-pin",
  html: '<span class="msj-map-pin-dot"></span><span class="msj-map-pin-pulse"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function LocationMap({ latitude, longitude, onPinMoved }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPinMovedRef = useRef(onPinMoved);
  const [looking, setLooking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onPinMovedRef.current = onPinMoved;
  }, [onPinMoved]);

  const hasPin = latitude != null && longitude != null;

  // Shared by the map click, marker drag, and "Use Current Location" — kept
  // as a ref so the map's own event handlers (registered once, on mount)
  // always call the latest version without needing to be re-bound.
  const applyPositionRef = useRef(async () => {});
  applyPositionRef.current = async (lat, lng) => {
    setLooking(true);
    setError("");
    try {
      const fields = await reverseGeocode(lat, lng);
      onPinMovedRef.current?.(fields);
    } catch {
      setError("Couldn't read that location. The coordinates were still saved.");
      onPinMovedRef.current?.({ latitude: lat, longitude: lng });
    } finally {
      setLooking(false);
    }
  };

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, { attributionControl: true, zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (e) => applyPositionRef.current(e.latlng.lat, e.latlng.lng));

    mapRef.current = map;
    // The container is measured before the step's layout settles, which leaves
    // grey tiles until Leaflet re-reads its size.
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!hasPin) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const position = [Number(latitude), Number(longitude)];

    if (!markerRef.current) {
      const marker = L.marker(position, { icon: pinIcon, draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        applyPositionRef.current(lat, lng);
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(position);
    }

    map.setView(position, Math.max(map.getZoom(), PLACED_ZOOM));
    setTimeout(() => map.invalidateSize(), 60);
  }, [latitude, longitude, hasPin]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support geolocation. Please search an address or drop the pin manually.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await applyPositionRef.current(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      (geoError) => {
        setLocating(false);
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location access was denied. Please allow location access, or search an address / drop the pin manually."
            : "Couldn't get your current location. Please search an address or drop the pin manually."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="msj-map-panel">
      <div className="msj-map-head">
        <div>
          <strong>Exact location</strong>
          <span>{hasPin ? "Drag the pin or click the map to adjust." : "Search an address to drop the pin."}</span>
        </div>
        <button type="button" className="msj-map-locate-btn" onClick={useCurrentLocation} disabled={locating}>
          <Icon name="compass" size={14} />
          {locating ? "Locating…" : "Use Current Location"}
        </button>
      </div>

      <div className="msj-map-canvas-wrap">
        <div ref={containerRef} className="msj-map-canvas" />
        {looking && <div className="msj-map-busy">Updating address…</div>}
      </div>

      {error && <span className="msj-field-hint">{error}</span>}
    </div>
  );
}

export default LocationMap;
