import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per bot-imported Masjid — the provenance/audit record the admin
// review queue (client/src/admin/pages/MasjidImports.jsx) reads from.
// Deliberately a separate table rather than more columns on Masjid itself,
// since none of this applies to the other ~99% of masjids (real
// registrations/admin-created).
const MasjidImportSource = sequelize.define(
  "MasjidImportSource",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    source: { type: DataTypes.STRING, allowNull: false, defaultValue: "google_places" },
    // Denormalized copy of Masjid.placeId, kept here too for convenient
    // querying without joining back to masjids for every discovery-run
    // "have we already seen this place" check.
    placeId: { type: DataTypes.STRING, allowNull: false },
    rawPlaceTypes: { type: DataTypes.JSON, allowNull: true },
    dataCompletenessPercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    duplicateCheckResult: { type: DataTypes.ENUM("passed", "merged"), allowNull: false, defaultValue: "passed" },
    // Set only when duplicateCheckResult is "merged" — the existing masjid
    // this discovery run enriched instead of creating a new row for.
    mergedIntoMasjidId: { type: DataTypes.INTEGER, allowNull: true },
    // Google's ~30-day cache-refresh expectation for non-Place-ID fields —
    // masjidBotSchedulerService.js's refresh pass only touches rows where
    // this is stale AND the masjid is still sitting at status:"under_review"
    // (once a human has reviewed/approved it, it's treated as claimed and
    // never silently overwritten again).
    sourceRefreshedAt: { type: DataTypes.DATE, allowNull: false },
    importedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: "masjid_import_sources",
    indexes: [
      { unique: true, fields: ["masjidId"], name: "masjid_import_sources_masjid_id_unique" },
      { fields: ["placeId"], name: "masjid_import_sources_place_id_idx" },
    ],
  }
);

export default MasjidImportSource;
