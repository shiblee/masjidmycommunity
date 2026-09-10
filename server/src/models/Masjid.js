import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Masjid = sequelize.define(
  "Masjid",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },

    // Generated once at creation from `name` (see utils/slugify.js) — never
    // auto-regenerated on a later name edit, so a shared/indexed URL stays
    // stable. Nullable only so existing rows can be backfilled once by
    // ensureMasjidSlugs() on server start; every masjid has one in practice.
    // The unique constraint is declared in the named `indexes` array below,
    // not inline here (`unique: true` on the column) — inline column-level
    // uniqueness isn't tracked by name across sequelize.sync({alter:true})
    // runs, so MySQL silently gained a fresh duplicate unique index on every
    // dev-server restart until it hit MySQL's 64-index-per-table ceiling
    // (fixed and cleaned up once; a named index in `indexes` is recognized
    // as already existing and never recreated).
    slug: { type: DataTypes.STRING, allowNull: true },

    name: { type: DataTypes.STRING, allowNull: false },
    tagline: { type: DataTypes.STRING, allowNull: true },
    about: { type: DataTypes.TEXT, allowNull: true },
    yearEstablished: { type: DataTypes.STRING, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: true },

    address: { type: DataTypes.STRING, allowNull: true },
    area: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    district: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },
    postalCode: { type: DataTypes.STRING, allowNull: true },
    mapLink: { type: DataTypes.STRING, allowNull: true },
    formattedAddress: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    // Google Place ID of the resolved address, when the location came from a
    // real Google Places selection — purely informational metadata, never
    // required for submission (manual/OpenStreetMap-fallback coordinates
    // remain fully acceptable).
    placeId: { type: DataTypes.STRING, allowNull: true },

    // IANA timezone name (e.g. "Asia/Kolkata"), resolved once from
    // latitude/longitude by prayerCalculationEngine.js the first time it
    // runs for this masjid, then cached here so every later run skips the
    // lookup. Engine-owned — deliberately excluded from masjidController.js's
    // UPDATABLE_FIELDS, never owner-editable.
    timezone: { type: DataTypes.STRING, allowNull: true },

    // Contact & verification moved to a list of office-bearers — see
    // MasjidContactPerson (one row per designation, each independently
    // OTP-verified). The old single imamName/contactMobile/contactEmail
    // columns are gone from this model; server/src/seed/masjidContactBackfill.js
    // migrates any pre-existing values into that table on first boot.

    status: {
      type: DataTypes.ENUM("draft", "submitted", "under_review", "changes_requested", "approved", "rejected", "inactive", "deleted"),
      allowNull: false,
      defaultValue: "draft",
    },
    adminFeedback: { type: DataTypes.TEXT, allowNull: true },

    // Auto-filled by AI the moment a masjid is first approved (see
    // adminMasjidController.js's `approve` + aiProviderService.js's
    // generateSeoMeta) — only when still empty, so an admin's own edit via
    // the SEO tab is never silently overwritten by a later approval.
    metaTitle: { type: DataTypes.STRING(70), allowNull: true },
    metaDescription: { type: DataTypes.STRING(200), allowNull: true },

    submittedAt: { type: DataTypes.DATE, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },

    // Set when the owner deletes the masjid (a soft delete — the record and
    // its history are kept for audit purposes, just hidden from the owner's
    // own list and excluded from public/admin views by default).
    deletionReason: { type: DataTypes.STRING, allowNull: true },
    deletionComment: { type: DataTypes.TEXT, allowNull: true },
    deletedAt: { type: DataTypes.DATE, allowNull: true },

    // Community-report moderation — separate from the approval `status` above.
    // "under_review" here hides the masjid from the public directory/Wall
    // without touching its approval state or any of its data.
    moderationStatus: { type: DataTypes.ENUM("active", "under_review"), allowNull: false, defaultValue: "active" },
    reportCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    moderationReviewedAt: { type: DataTypes.DATE, allowNull: true },

    // Provenance — who/what actually created this record. "user" (the
    // default) covers every masjid registered through the public wizard;
    // "admin" covers ones an admin added directly (see seed/platformUserDefaults.js);
    // "bot_import" covers ones masjidDiscoveryService.js found via the Masjid
    // Bot. Deliberately separate from `status` and from Green Tick — a
    // bot-imported masjid existing in the directory is not the same claim
    // as it being identity-verified (see GreenTickApplication.js).
    creationMethod: {
      type: DataTypes.ENUM("user", "admin", "bot_import"),
      allowNull: false,
      defaultValue: "user",
    },
  },
  {
    tableName: "masjids",
    indexes: [
      { fields: ["userId"], name: "masjids_user_id_idx" },
      { fields: ["status"], name: "masjids_status_idx" },
      { unique: true, fields: ["slug"], name: "masjids_slug_unique" },
      { fields: ["creationMethod"], name: "masjids_creation_method_idx" },
    ],
  }
);

export default Masjid;
