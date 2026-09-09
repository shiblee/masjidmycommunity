import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A brand-new table — zero migration risk (see the skills-column incident
// note on Job.js). Status changes are logged into the existing JobHistory
// table (job-scoped, action: "application_status_changed") rather than a
// second history table here.
const JobApplication = sequelize.define(
  "JobApplication",
  {
    jobId: { type: DataTypes.INTEGER, allowNull: false },
    applicantUserId: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM("applied", "under_review", "shortlisted", "rejected", "hired"),
      allowNull: false,
      defaultValue: "applied",
    },
    // Captures name/bio/education/workExperience/skills at the moment of
    // application, so a later profile edit doesn't retroactively change
    // what was actually submitted. Nullable, no default — a JSON column
    // with a literal default is exactly what broke Job.skills in production.
    profileSnapshot: { type: DataTypes.JSON, allowNull: true },
    resumeFileName: { type: DataTypes.STRING, allowNull: true },
    resumePath: { type: DataTypes.STRING, allowNull: true },
    coverNote: { type: DataTypes.TEXT, allowNull: true },
    // Job creator/admin's private notes — never shown to the applicant.
    remarks: { type: DataTypes.TEXT, allowNull: true },
    reviewedBy: { type: DataTypes.INTEGER, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "job_applications",
    indexes: [
      { fields: ["jobId"], name: "job_applications_job_id_idx" },
      // One application per user per job — the app-level duplicate check in
      // applyToJob mirrors publicReportController.js's identical pattern.
      { unique: true, fields: ["jobId", "applicantUserId"], name: "job_applications_job_applicant_unique" },
    ],
  }
);

export default JobApplication;
