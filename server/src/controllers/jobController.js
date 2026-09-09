import Job from "../models/Job.js";
import JobHistory from "../models/JobHistory.js";
import User from "../models/User.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { firstRestrictedField, RESTRICTED_CONTENT_MESSAGE } from "../utils/contentModeration.js";
import { recordJobPostedActivity } from "../services/communityActivityService.js";

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

    const { title, description, jobType, experienceRequired, skills, location, salary, applicationDeadline, contactMethod } = req.body;

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
      skills: normalizeSkills(skills),
      location: location.trim(),
      salary: salary?.trim() || null,
      applicationDeadline: applicationDeadline || null,
      contactMethod: contactMethod?.trim() || null,
    });
    await logJobHistory(job.id, "posted", `${job.title} — ${job.location}`, "user", null);
    const poster = await User.findByPk(job.userId, { attributes: ["fullName"] });
    recordJobPostedActivity(job, poster).catch(() => {});

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

    const { title, description, jobType, experienceRequired, skills, location, salary, applicationDeadline, contactMethod } = req.body;

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
    if (skills !== undefined) job.skills = normalizeSkills(skills);
    if (location !== undefined) job.location = location.trim();
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
