import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Admin-defined catalogue of documents the Green Tick verification process
// can request — never hardcode a document type name in application logic,
// always query isActive:true (and filter by category) here, so admins can
// add further document types later with no code change. One shared shape
// serves representative identity documents and masjid/property documents;
// `category` is what tells them apart.
const VerificationDocumentType = sequelize.define(
  "VerificationDocumentType",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.ENUM("representative", "masjid", "property"), allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    isRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "verification_document_types",
    indexes: [{ unique: true, fields: ["name"], name: "verification_document_types_name_unique" }],
  }
);

export default VerificationDocumentType;
