import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import Job from "../models/Job.js";
import JobHistory from "../models/JobHistory.js";
import JobApplication from "../models/JobApplication.js";
import JobFavorite from "../models/JobFavorite.js";
import User from "../models/User.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { firstRestrictedField, RESTRICTED_CONTENT_MESSAGE } from "../utils/contentModeration.js";
import { validateFields, normalizeSkills, logJobHistory, serializeApplication, applyApplicationStatusChange } from "./jobController.js";
import { PLATFORM_EMAIL } from "../seed/platformUserDefaults.js";
import { recordJobPostedActivity } from "../services/communityActivityService.js";
import CommunityActivity from "../models/CommunityActivity.js";
import { deleteActivityCascade } from "./publicCommunityController.js";

const STATUSES = ["active", "closed", "expired", "deleted"];

export const listAll = async (req, res) => {
  try {
    const { status, jobType, q, page = 1, pageSize = 20, sortBy = "createdAt", sortDir = "desc" } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (jobType) where.jobType = jobType;
    if (q) {
      const term = q.trim();
      where[Op.or] = [{ title: { [Op.like]: `%${term}%` } }, { location: { [Op.like]: `%${term}%` } }];
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
    const order = [[["title", "location", "createdAt", "applicationDeadline", "status"].includes(sortBy) ? sortBy : "createdAt", sortDir === "asc" ? "ASC" : "DESC"]];

    const { rows, count } = await Job.findAndCountAll({ where, order, limit, offset });
    const posterIds = [...new Set(rows.map((j) => j.userId))];
    const posters = await User.findAll({ where: { id: posterIds }, attributes: ["id", "fullName", "email"] });
    const posterById = new Map(posters.map((u) => [u.id, u]));

    const jobs = rows.map((j) => ({ ...j.toJSON(), poster: posterById.get(j.userId) || null }));

    const counts = {};
    for (const s of STATUSES) counts[s] = await Job.count({ where: { status: s } });

    res.json({ jobs, total: count, page: Number(page) || 1, pageSize: limit, counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    const [poster, history] = await Promise.all([
      User.findByPk(job.userId, { attributes: ["id", "fullName", "email", "mobile", "createdAt"] }),
      JobHistory.findAll({ where: { jobId: job.id }, order: [["createdAt", "DESC"]] }),
    ]);

    res.json({ job, poster, history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Attributed to the platform account (same as adminCampaignController.js's
// create()) rather than a null/fake user — "Created by Admin" is recorded
// in JobHistory ("admin_created") and surfaced on the detail page from
// there, not by inventing a userId-less job row.
export const create = async (req, res) => {
  try {
    const error = validateFields(req.body);
    if (error) return res.status(400).json({ message: error });

    const { title, description, jobType, experienceRequired, category, workMode, skills, location, formattedAddress, latitude, longitude, placeId, salary, applicationDeadline, contactMethod } = req.body;

    const restrictedField = await firstRestrictedField({ title: title.trim(), description: description.trim() });
    if (restrictedField) {
      return res.status(400).json({ field: restrictedField, message: RESTRICTED_CONTENT_MESSAGE });
    }

    const platformUser = await User.findOne({ where: { email: PLATFORM_EMAIL } });
    if (!platformUser) return res.status(500).json({ message: "Platform account is not configured." });

    const slug = await generateUniqueSlug(Job, title.trim(), { fallback: "job" });

    const job = await Job.create({
      userId: platformUser.id,
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
    await logJobHistory(job.id, "admin_created", `${job.title} — ${job.location}`, "admin", req.user.email);
    recordJobPostedActivity(job, platformUser).catch(() => {});

    res.status(201).json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Unlike the owner's own updateJob, admin can edit any field regardless of
// status — a closed/expired listing is still fully editable from here.
export const update = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

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
    await logJobHistory(job.id, "admin_updated", null, "admin", req.user.email);
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Select a valid status." });
    if (status === job.status) return res.status(400).json({ message: `This job is already ${status}.` });

    const from = job.status;
    job.status = status;
    await job.save();
    await logJobHistory(job.id, "status_changed", `${from} → ${status}`, "admin", req.user.email);
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateModeration = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    const { moderationStatus } = req.body;
    if (!["active", "under_review"].includes(moderationStatus)) return res.status(400).json({ message: "Select a valid moderation status." });

    job.moderationStatus = moderationStatus;
    job.moderationReviewedAt = new Date();
    await job.save();
    await logJobHistory(job.id, "moderation_changed", moderationStatus === "active" ? "Restored to public view" : "Hidden from public view", "admin", req.user.email);
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Genuine hard delete -- activates the "jobs":"delete" permission action
// already declared in permissionModules.js, which had no implementation at
// all before this (only the "deleted" status value on updateStatus, which
// keeps the row). Needed so a user who has ever posted a job can still be
// hard-deleted (deleteUser() refuses while any Job row references them),
// mirroring the same real gap already fixed for users/staff/masjids.
export const hardDelete = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

    // The "New opening: ..." wall post has to go through the real cascade,
    // not a raw destroy -- same reasoning as deleteUser()'s ownActivities
    // cleanup -- so it doesn't orphan that post's own Comment/Vote/Report rows.
    const relatedActivities = await CommunityActivity.findAll({ where: { relatedJobId: job.id } });
    for (const activity of relatedActivities) await deleteActivityCascade(activity);

    await Promise.all([
      JobApplication.destroy({ where: { jobId: job.id } }),
      JobFavorite.destroy({ where: { jobId: job.id } }),
      JobHistory.destroy({ where: { jobId: job.id } }),
    ]);
    await job.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Full admin visibility/management of applicants — same underlying
// JobApplication data as the job creator's own /account/my-jobs/:id/applications
// screen (jobController.js's listApplicants/updateApplicationStatus), just
// without the ownership gate.
export const listApplications = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });

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

export const updateApplicationStatus = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });
    const application = await JobApplication.findOne({ where: { id: req.params.appId, jobId: job.id } });
    if (!application) return res.status(404).json({ message: "Application not found." });

    const error = await applyApplicationStatusChange(application, job, { ...req.body, actorType: "admin", actorName: req.user.email });
    if (error) return res.status(400).json({ message: error });

    const applicant = await User.findByPk(application.applicantUserId, { attributes: ["id", "fullName", "email", "mobile", "username"] });
    res.json({ application: serializeApplication(application, applicant) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadApplicantResume = async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found." });
    const application = await JobApplication.findOne({ where: { id: req.params.appId, jobId: job.id } });
    if (!application?.resumePath || !fs.existsSync(application.resumePath)) return res.status(404).json({ message: "No resume on file." });
    res.download(path.resolve(application.resumePath), application.resumeFileName || "resume");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
