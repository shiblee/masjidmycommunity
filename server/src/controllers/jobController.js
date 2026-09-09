import Job from "../models/Job.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { firstRestrictedField, RESTRICTED_CONTENT_MESSAGE } from "../utils/contentModeration.js";

const JOB_TYPES = new Set(["full_time", "part_time", "contract", "internship", "volunteer"]);

async function findOwnedJob(req, res) {
  const job = await Job.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!job) {
    res.status(404).json({ message: "Job not found." });
    return null;
  }
  return job;
}

function validateFields(body) {
  if (!body.title?.trim()) return "Job title is required.";
  if (!body.description?.trim()) return "Job description is required.";
  if (!body.location?.trim()) return "Location is required.";
  if (body.jobType && !JOB_TYPES.has(body.jobType)) return "Select a valid job type.";
  return null;
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
      jobType: jobType || "full_time",
      experienceRequired: experienceRequired?.trim() || null,
      skills: skills?.trim() || null,
      location: location.trim(),
      salary: salary?.trim() || null,
      applicationDeadline: applicationDeadline || null,
      contactMethod: contactMethod?.trim() || null,
    });

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
    if (jobType !== undefined) job.jobType = jobType;
    if (experienceRequired !== undefined) job.experienceRequired = experienceRequired?.trim() || null;
    if (skills !== undefined) job.skills = skills?.trim() || null;
    if (location !== undefined) job.location = location.trim();
    if (salary !== undefined) job.salary = salary?.trim() || null;
    if (applicationDeadline !== undefined) job.applicationDeadline = applicationDeadline || null;
    if (contactMethod !== undefined) job.contactMethod = contactMethod?.trim() || null;

    await job.save();
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
    res.json({ job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
