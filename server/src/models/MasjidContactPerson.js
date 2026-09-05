import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MasjidContactPerson = sequelize.define(
  "MasjidContactPerson",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },

    // Snapshot of a MasjidContactDesignation.name at the time this person was
    // added/saved — not a foreign key, matching this codebase's existing
    // string-match convention for Masjid.category vs MasjidCategory.name.
    designation: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    mobile: { type: DataTypes.STRING, allowNull: false },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    otpCode: { type: DataTypes.STRING, allowNull: true },
    otpExpiresAt: { type: DataTypes.DATE, allowNull: true },
    otpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    otpLastSentAt: { type: DataTypes.DATE, allowNull: true },

    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "masjid_contact_people",
    indexes: [{ fields: ["masjidId"], name: "masjid_contact_people_masjid_id_idx" }],
  }
);

export default MasjidContactPerson;
