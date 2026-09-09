import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Jobs are personal, not masjid-scoped — any registered user can post one
// with its own `location` field, unlike Campaign which requires an
// approved + Green-Tick masjid. Auto-published (status defaults "active",
// no draft/under_review approval lifecycle) since content validation runs
// synchronously at creation instead of a human review step — see
// jobController.js's createJob.
const Job = sequelize.define(
  "Job",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },

    title: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },

    // Free text (the selected EmploymentType's own name, e.g. "Full-time") —
    // admin-managed under Admin Panel -> Meta -> Employment Types, the same
    // master data already used for a user's Work Experience entries, rather
    // than a second, parallel "job type" list. Not a foreign key: kept
    // denormalized like Donation.bankName, so a job's own record is
    // unaffected if that master list is later renamed/removed.
    jobType: { type: DataTypes.STRING, allowNull: false, defaultValue: "Full-time" },
    // Same denormalized-string approach as jobType, sourced from Admin Panel
    // -> Meta -> Experience Level.
    experienceRequired: { type: DataTypes.STRING, allowNull: true },
    // Array of skill names (admin-managed under Meta -> Skill, same master
    // list a user's own profile Skills picker already uses) — a job can list
    // more than one, so this is JSON rather than the single denormalized
    // string jobType/experienceRequired use.
    // Nullable rather than NOT NULL + a default — MySQL's ALTER for a JSON
    // column combined with a literal DEFAULT is what actually broke this
    // migration in production (not the row data, which was already cleared
    // to NULL and it still failed the same way). The app never persists
    // null itself either way — jobController.js's normalizeSkills always
    // writes at least [].
    skills: { type: DataTypes.JSON, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: false },
    salary: { type: DataTypes.STRING, allowNull: true },
    applicationDeadline: { type: DataTypes.DATEONLY, allowNull: true },
    contactMethod: { type: DataTypes.STRING, allowNull: true },

    // Lifecycle — no "draft"/"under_review" step, since a job is live the
    // moment it's created (subject to the synchronous content check in
    // createJob, not a human approval queue).
    status: {
      type: DataTypes.ENUM("active", "closed", "expired", "deleted"),
      allowNull: false,
      defaultValue: "active",
    },

    // Community-report moderation — same shape as Campaign/Masjid, so the
    // reported-content queue and admin activate/deactivate controls have a
    // real hook from day one even before those admin screens are built.
    moderationStatus: { type: DataTypes.ENUM("active", "under_review"), allowNull: false, defaultValue: "active" },
    reportCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    moderationReviewedAt: { type: DataTypes.DATE, allowNull: true },

    applicationCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    viewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "jobs",
    indexes: [
      { fields: ["userId"], name: "jobs_user_id_idx" },
      { fields: ["status"], name: "jobs_status_idx" },
      { unique: true, fields: ["slug"], name: "jobs_slug_unique" },
    ],
  }
);

export default Job;
