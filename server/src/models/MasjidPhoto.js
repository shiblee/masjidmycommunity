import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MasjidPhoto = sequelize.define(
  "MasjidPhoto",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    mediaType: { type: DataTypes.ENUM("photo", "video"), allowNull: false, defaultValue: "photo" },
    category: {
      type: DataTypes.ENUM("exterior", "interior", "prayer_hall", "community", "facilities", "other"),
      allowNull: false,
      defaultValue: "other",
    },
    caption: { type: DataTypes.STRING, allowNull: true },
    isCover: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "masjid_photos",
    indexes: [{ fields: ["masjidId"], name: "masjid_photos_masjid_id_idx" }],
  }
);

export default MasjidPhoto;
