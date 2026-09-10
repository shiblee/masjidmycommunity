import fs from "fs";
import path from "path";
import Job from "../models/Job.js";
import JobHistory from "../models/JobHistory.js";
import JobApplication from "../models/JobApplication.js";
import User from "../models/User.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { firstRestrictedField, RESTRICTED_CONTENT_MESSAGE } from "../utils/contentModeration.js";
// import { recordJobPostedActivity } from "../services/communityActivityService.js"; // "jobs as community posts" disabled — see createJob below
import { buildProfileSnapshot } from "./publicUserController.js";
import {
  sendJobApplicationSubmittedNotifications,
  sendJobApplicationStatusUpdatedNotifications,
} from "../services/jobApplicationNotificationService.js";

const APPLICATION_STATUSES = ["applied", "under_review", "shortlisted", "rejected", "hired"];
const APPLICATION_STATUS_LABEL = {
  applied: "Applied",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Selected / Hired",
};

async function findOwnedJob(req, res) {
  const job = await Job.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!job) {
    res.status(404).json({ message: "Job not found." });
    return null;
  }
  return job;
}

// Shared with adminJobController.js so an admin edit/status change is
// tracked in the exact same table/shape as an owner's own — one history
// list per job, not two systems to reconcile on the detail page.
export async function logJobHistory(jobId, action, note, actorType, actorName) {
  await JobHistory.create({ jobId, action, actorType, actorName: actorName || (actorType === "admin" ? "Admin" : "Owner"), note: note || null });
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Exported so adminJobController.js's create/update run the identical
// checks instead of a second, drifting copy — "use the same ... validation
// as the user-side Add Job functionality" from the admin task applies
// literally here.
export function validateFields(body) {
  if (!body.title?.trim()) return "Job title is required.";
  if (!body.description?.trim()) return "Job description is required.";
  if (!body.location?.trim()) return "Location is required.";
  // Plain string comparison works here since both sides are YYYY-MM-DD.
  if (body.applicationDeadline && body.applicationDeadline < todayStr()) {
    return "Application deadline can't be in the past.";
  }
  return null;
}

export function normalizeSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))].slice(0, 20);
}

export const listMine = async (req, res) => {
  try {
    const jobs = await Job.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Every job the current user has applied to, across all posters — rolls up
// the same per-application shape JobApplicants.jsx already renders per-job,
// joined with a small job summary so the page can link back to each listing.
export const listMyApplications = async (req, res) => {
  try {
    const applications = await JobApplication.findAll({ where: { applicantUserId: req.user.id }, order: [["createdAt", "DESC"]] });
    const jobIds = applications.map((a) => a.jobId);
    const jobs = jobIds.length ? await Job.findAll({ where: { id: jobIds } }) : [];
    const jobById = new Map(jobs.map((j) => [j.id, j]));

    const rows = applications
      .map((a) => {
        const job = jobById.get(a.jobId);
        if (!job) return null;
        const json = serializeApplication(a, null);
        delete json.applicant;
        json.job = { id: job.id, slug: job.slug, title: job.title, jobType: job.jobType, location: job.location, status: job.status };
        return json;
      })
      .filter(Boolean);

    res.json({ applications: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// No draft/submit/review lifecycle — a job goes live the moment it's
// created, subject only to this synchronous content check (the same
// rule-based filter masjidController.js's createDraft already runs at
// creation time, for the same reason: there's no later "submit" step to
// catch it at instead).
export const createJob = async (req, res) => {
  try {
    const error = validateFields(req.body);
    if (error) return res.status(400).json({ message: error });

    const { title, description, jobType, experienceRequired, category, workMode, skills, location, formattedAddress, latitude, longitude, placeId, salary, applicationDeadline, contactMethod } = req.body;

    const restrictedField = await firstRestrictedField({ title: title.trim(), description: description.trim() });
    if (restrictedField) {
      return res.status(400).json({ field: restrictedField, message: RESTRICTED_CONTENT_MESSAGE });
    }

    const slug = await generateUniqueSlug(Job, title.trim(), { fallback: "job" });

    const job = await Job.create({
      userId: req.user.id,
      title: title.trim(),
      slug,
      description: description.trim(),
      jobType: jobType?.trim() || "Full-time",
      experienceRequired: experienceRequired?.trim() || null,
      category: category?.trim() || null,
      workMode: workMode || null,
      skills: normalizeSkills(skills),
      location: location.trim(),
      formattedAddress: formattedAddress?.trim() || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      placeId: placeId?.trim() || null,
      salary: salary?.trim() || null,
      applicationDeadline: applicationDeadline || null,
      contactMethod: contactMethod?.trim() || null,
    });
    await logJobHistory(job.id, "posted", `${job.title} — ${job.location}`, "user", null);
    // "Jobs as community posts" disabled by explicit request — a job no
    // longer gets a Wall post (and therefore no like/comment section on its
    // own detail page). Re-enable by restoring this call; recordJobPostedActivity
    // itself is untouched.
    // const poster = await User.findByPk(job.userId, { attributes: ["fullName"] });
    // recordJobPostedActivity(job, poster).catch(() => {});

    res.status(201).json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    if (!["active", "closed"].includes(job.status)) {
      return res.status(400).json({ message: "This job can no longer be edited." });
    }

    const error = validateFields({ ...job.toJSON(), ...req.body });
    if (error) return res.status(400).json({ message: error });

    const { title, description, jobType, experienceRequired, category, workMode, skills, location, formattedAddress, latitude, longitude, placeId, salary, applicationDeadline, contactMethod } = req.body;

    const restrictedField = await firstRestrictedField({ title: (title ?? job.title).trim(), description: (description ?? job.description).trim() });
    if (restrictedField) {
      return res.status(400).json({ field: restrictedField, message: RESTRICTED_CONTENT_MESSAGE });
    }

    if (title !== undefined && title.trim() !== job.title) {
      job.slug = await generateUniqueSlug(Job, title.trim(), { fallback: "job", excludeId: job.id });
    }
    if (title !== undefined) job.title = title.trim();
    if (description !== undefined) job.description = description.trim();
    if (jobType !== undefined) job.jobType = jobType.trim() || job.jobType;
    if (experienceRequired !== undefined) job.experienceRequired = experienceRequired?.trim() || null;
    if (category !== undefined) job.category = category?.trim() || null;
    if (workMode !== undefined) job.workMode = workMode || null;
    if (skills !== undefined) job.skills = normalizeSkills(skills);
    if (location !== undefined) job.location = location.trim();
    if (formattedAddress !== undefined) job.formattedAddress = formattedAddress?.trim() || null;
    if (latitude !== undefined) job.latitude = latitude ?? null;
    if (longitude !== undefined) job.longitude = longitude ?? null;
    if (placeId !== undefined) job.placeId = placeId?.trim() || null;
    if (salary !== undefined) job.salary = salary?.trim() || null;
    if (applicationDeadline !== undefined) job.applicationDeadline = applicationDeadline || null;
    if (contactMethod !== undefined) job.contactMethod = contactMethod?.trim() || null;

    await job.save();
    await logJobHistory(job.id, "updated", null, "user", null);
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const closeJob = async (req, res) => {
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    if (job.status !== "active") return res.status(400).json({ message: "Only an active job can be closed." });
    job.status = "closed";
    await job.save();
    await logJobHistory(job.id, "status_changed", "active → closed", "user", null);
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reopenJob = async (req, res) => {
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    if (job.status !== "closed") return res.status(400).json({ message: "Only a closed job can be reopened." });
    job.status = "active";
    await job.save();
    await logJobHistory(job.id, "status_changed", "closed → active", "user", null);
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Exported for adminJobController.js's own listApplications/updateStatus
// routes, so admin sees applications in the exact same shape the job
// creator does.
export function serializeApplication(application, applicant) {
  const json = application.toJSON();
  delete json.resumePath; // server-side disk path only — never sent to the client
  json.hasResume = !!application.resumePath;
  json.applicant = applicant ? { id: applicant.id, fullName: applicant.fullName, email: applicant.email, mobile: applicant.mobile, username: applicant.username } : null;
  return json;
}

// Login-gated (auth, requireUser at the route level) — any registered user
// except the job's own creator can apply once. Profile auto-fill mirrors
// getPublicProfile's own aggregation via buildProfileSnapshot, so an
// application always shows what a viewer would see on the applicant's
// profile at the time they applied, not a second drifting copy of the data.
export const applyToJob = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });
    if (job.status !== "active") return res.status(400).json({ message: "This job is no longer accepting applications." });
    if (job.userId === req.user.id) return res.status(400).json({ message: "You can't apply to your own job posting." });

    const existing = await JobApplication.findOne({ where: { jobId: job.id, applicantUserId: req.user.id } });
    if (existing) return res.status(409).json({ message: "You've already applied to this job." });

    const applicant = await User.findByPk(req.user.id);
    if (!applicant) return res.status(404).json({ message: "Account not found." });

    let resumePath = applicant.resumePath;
    let resumeFileName = applicant.resumeFileName;
    if (req.file) {
      const previousPath = applicant.resumePath;
      resumePath = req.file.path;
      resumeFileName = req.file.originalname;
      // Also becomes the applicant's new standing resume, reused by future
      // applications — matches "review/update before submitting".
      applicant.resumePath = resumePath;
      applicant.resumeFileName = resumeFileName;
      await applicant.save();
      if (previousPath && previousPath !== resumePath) fs.unlink(previousPath, () => {});
    }

    const profileSnapshot = await buildProfileSnapshot(applicant);

    const application = await JobApplication.create({
      jobId: job.id,
      applicantUserId: applicant.id,
      profileSnapshot,
      resumePath,
      resumeFileName,
      coverNote: req.body.coverNote?.trim() || null,
    });

    job.applicationCount = await JobApplication.count({ where: { jobId: job.id } });
    await job.save();

    const poster = await User.findByPk(job.userId);
    sendJobApplicationSubmittedNotifications(application, job, applicant, poster).catch(() => {});

    res.status(201).json({ application: serializeApplication(application, applicant) });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "You've already applied to this job." });
    res.status(500).json({ message: error.message });
  }
};

// Powers JobApplyPanel.jsx's "already applied" state.
export const getMyApplication = async (req, res) => {
  try {
    const application = await JobApplication.findOne({ where: { jobId: req.params.id, applicantUserId: req.user.id } });
    res.json({ application: application ? serializeApplication(application, null) : null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listApplicants = async (req, res) => {
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    const applications = await JobApplication.findAll({ where: { jobId: job.id }, order: [["createdAt", "DESC"]] });
    const applicantIds = applications.map((a) => a.applicantUserId);
    const applicants = applicantIds.length
      ? await User.findAll({ where: { id: applicantIds }, attributes: ["id", "fullName", "email", "mobile", "username"] })
      : [];
    const applicantById = new Map(applicants.map((u) => [u.id, u]));
    res.json({ applications: applications.map((a) => serializeApplication(a, applicantById.get(a.applicantUserId))) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getApplicant = async (req, res) => {
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    const application = await JobApplication.findOne({ where: { id: req.params.appId, jobId: job.id } });
    if (!application) return res.status(404).json({ message: "Application not found." });
    const applicant = await User.findByPk(application.applicantUserId, { attributes: ["id", "fullName", "email", "mobile", "username", "createdAt"] });
    res.json({ application: serializeApplication(application, applicant) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Shared by the owner-facing route here and adminJobController.js's own
// status-management route — one status-transition implementation, not two
// drifting copies (same reasoning as validateFields/normalizeSkills above).
export async function applyApplicationStatusChange(application, job, { status, remarks, actorType, actorName }) {
  if (status !== undefined) {
    if (!APPLICATION_STATUSES.includes(status)) return "Select a valid status.";
    const from = application.status;
    if (from !== status) {
      application.status = status;
      application.reviewedAt = new Date();
      await logJobHistory(
        job.id,
        "application_status_changed",
        `${APPLICATION_STATUS_LABEL[from]} → ${APPLICATION_STATUS_LABEL[status]} (applicant #${application.applicantUserId})`,
        actorType,
        actorName
      );
    }
  }
  if (remarks !== undefined) application.remarks = remarks?.trim() || null;
  await application.save();

  if (status !== undefined) {
    const applicant = await User.findByPk(application.applicantUserId);
    const poster = await User.findByPk(job.userId);
    if (applicant) {
      sendJobApplicationStatusUpdatedNotifications(application, job, applicant, poster, APPLICATION_STATUS_LABEL[status]).catch(() => {});
    }
  }
  return null;
}

export const updateApplicationStatus = async (req, res) => {
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    const application = await JobApplication.findOne({ where: { id: req.params.appId, jobId: job.id } });
    if (!application) return res.status(404).json({ message: "Application not found." });

    const error = await applyApplicationStatusChange(application, job, { ...req.body, actorType: "user", actorName: null });
    if (error) return res.status(400).json({ message: error });

    const applicant = await User.findByPk(application.applicantUserId, { attributes: ["id", "fullName", "email", "mobile", "username"] });
    res.json({ application: serializeApplication(application, applicant) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadApplicantResume = async (req, res) => {
  try {
    const job = await findOwnedJob(req, res);
    if (!job) return;
    const application = await JobApplication.findOne({ where: { id: req.params.appId, jobId: job.id } });
    if (!application?.resumePath || !fs.existsSync(application.resumePath)) return res.status(404).json({ message: "No resume on file." });
    res.download(path.resolve(application.resumePath), application.resumeFileName || "resume");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
