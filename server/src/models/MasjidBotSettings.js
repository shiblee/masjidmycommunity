import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — admin-configurable controls for the Masjid
// discovery/import bot (masjidDiscoveryService.js / masjidBotSchedulerService.js).
// Deliberately a separate model from MapSettings.js: MapSettings.googleMapsApiKey
// is a browser-restricted key already served to the public (see
// publicMasjidController.js), whereas placesApiServerKey below is a genuine
// secret that must never be sent to the browser — mixing the two into one
// model would risk that secret leaking through an existing public endpoint.
const MasjidBotSettings = sequelize.define(
  "MasjidBotSettings",
  {
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    masjidsPerHour: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    // International % is always `100 - indiaPercent`, never stored
    // separately — same anti-drift reasoning as the other two bots.
    indiaPercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 80 },
    activeHourStart: { type: DataTypes.INTEGER, allowNull: true },
    activeHourEnd: { type: DataTypes.INTEGER, allowNull: true },
    maxMasjidsPerDay: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 50 },
    maxTotalImportedMasjids: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 500 },
    // Off by default — bot imports land at status:"under_review" (the
    // existing admin review tab) and need a human Approve click before
    // going publicly live. Turning this on skips straight to "approved".
    autoPublish: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // A NEW, separate, server-side Google Cloud API key — never the
    // existing public MapSettings.googleMapsApiKey. Never serialized back
    // to the client in full by adminMasjidBotController.js.
    placesApiServerKey: { type: DataTypes.STRING, allowNull: true },
    // Independent safety cap from masjidsPerHour: most Places API calls in
    // a discovery run are spent on candidates that turn out to be
    // duplicates or non-mosques, not on successful imports, so real Google
    // Cloud billing tracks this number more closely than masjidsPerHour.
    maxApiCallsPerHour: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 200 },
  },
  {
    tableName: "masjid_bot_settings",
  }
);

export default MasjidBotSettings;
