import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MasjidContactDesignation = sequelize.define(
  "MasjidContactDesignation",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // Drives the mandatory-office-bearer submission gate — never hardcode
    // "Imam"/"Mutawalli"/"Secretary" by name in gate logic, always query
    // isRequired:true so admins can (in principle) add further mandatory
    // designations later without a code change.
    isRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "masjid_contact_designations",
    indexes: [{ unique: true, fields: ["name"], name: "masjid_contact_designations_name_unique" }],
  }
);

export default MasjidContactDesignation;
