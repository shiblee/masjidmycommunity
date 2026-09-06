import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — lets an admin update the Google Maps API key and
// the address-search country bias from the admin panel, with no rebuild or
// redeploy required (previously these lived only in a build-time env var).
//
// Serving the key to the public client as-is is not a security downgrade:
// browser-side Google Maps API keys are inherently public (visible in every
// request the browser makes, in dev tools, in the page source) regardless
// of whether they come from here or a bundled env var — the real security
// boundary is the key's own HTTP-referrer/API restrictions, configured in
// Google Cloud Console, not secrecy of the value itself.
const MapSettings = sequelize.define(
  "MapSettings",
  {
    googleMapsApiKey: { type: DataTypes.STRING, allowNull: true },
    addressCountry: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "map_settings",
  }
);

export default MapSettings;
