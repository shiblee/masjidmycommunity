import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One shape for every Green Tick document — representative identity docs
// (representativeId set) and masjid/property docs (representativeId null,
// distinguished by the referenced VerificationDocumentType's own category).
// "Property Verification" in the admin dashboard is just this table
// filtered to category:"property" documents, not a separate pipeline.
// Stored outside the public /uploads mount (see upload.js's
// uploadGreenTickDocuments) — served only via an authenticated,
// ownership-checked download route, never a direct URL.
const GreenTickDocument = sequelize.define(
  "GreenTickDocument",
  {
    applicationId: { type: DataTypes.INTEGER, allowNull: false },
    representativeId: { type: DataTypes.INTEGER, allowNull: true },
    documentTypeId: { type: DataTypes.INTEGER, allowNull: false },
    fileName: { type: DataTypes.STRING, allowNull: false },
    storedPath: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: true },
    fileSize: { type: DataTypes.INTEGER, allowNull: true },
    documentNumber: { type: DataTypes.STRING, allowNull: true },
    issueDate: { type: DataTypes.DATEONLY, allowNull: true },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM("pending", "approved", "rejected", "replacement_requested"), allowNull: false, defaultValue: "pending" },
    reviewerRemarks: { type: DataTypes.TEXT, allowNull: true },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "green_tick_documents",
    indexes: [
      { fields: ["applicationId"], name: "green_tick_documents_application_idx" },
      { fields: ["representativeId"], name: "green_tick_documents_representative_idx" },
    ],
  }
);

export default GreenTickDocument;
