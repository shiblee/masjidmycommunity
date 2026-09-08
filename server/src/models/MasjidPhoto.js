import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MasjidPhoto = sequelize.define(
  "MasjidPhoto",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    mediaType: { type: DataTypes.ENUM("photo", "video"), allowNull: false, defaultValue: "photo" },
    // A real extracted frame (see utils/videoThumbnail.js), null for photos
    // and for videos uploaded before this existed.
    posterUrl: { type: DataTypes.STRING, allowNull: true },
    category: {
      type: DataTypes.ENUM("exterior", "interior", "prayer_hall", "community", "facilities", "other"),
      allowNull: false,
      defaultValue: "other",
    },
    caption: { type: DataTypes.STRING, allowNull: true },
    isCover: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // "upload" (default) is every real Multer-uploaded photo, unchanged.
    // "google_places" photos are never downloaded/re-hosted — `url` for
    // those points at masjidPhotoProxyController.js's proxy route, which
    // streams the image from Google's Place Photo Media endpoint using the
    // secret server key at request time, keyed off sourcePhotoReference.
    sourceType: { type: DataTypes.ENUM("upload", "google_places"), allowNull: false, defaultValue: "upload" },
    // TEXT, not STRING/VARCHAR(255) — Google's photo resource names
    // ("places/<id>/photos/<long token>") routinely exceed 255 characters.
    sourcePhotoReference: { type: DataTypes.TEXT, allowNull: true },
    // Google requires displaying photo-contributor attribution alongside
    // Places photos — shown next to the caption on the public masjid page.
    attributionText: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "masjid_photos",
    indexes: [{ fields: ["masjidId"], name: "masjid_photos_masjid_id_idx" }],
  }
);

export default MasjidPhoto;
