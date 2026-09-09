import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import EmploymentType from "../models/EmploymentType.js";
import ExperienceLevel from "../models/ExperienceLevel.js";
import Skill from "../models/Skill.js";

// The public Jobs board's filter chips need the same admin-managed master
// lists the posting form uses, but those otherwise only have auth-gated
// endpoints (/users/meta/...) — this page is browsable while logged out, so
// each needs its own public read.
export const listJobTypes = async (req, res) => {
  try {
    const employmentTypes = await EmploymentType.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ employmentTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listExperienceLevels = async (req, res) => {
  try {
    const experienceLevels = await ExperienceLevel.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ experienceLevels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listSkills = async (req, res) => {
  try {
    const skills = await Skill.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ skills });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const PUBLIC_STATUSES = ["active"];

async function withCard(job) {
  const poster = await User.findByPk(job.userId, { attributes: ["id", "fullName", "locationCity", "locationCountry"] });
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    jobType: job.jobType,
    experienceRequired: job.experienceRequired,
    location: job.location,
    salary: job.salary,
    applicationDeadline: job.applicationDeadline,
    createdAt: job.createdAt,
    postedBy: poster?.fullName || "A community member",
  };
}

export const listPublic = async (req, res) => {
  try {
    const { q, jobType, experienceRequired, hasSalary, skills, location, excludeId, page = 1, pageSize = 12 } = req.query;
    const where = { status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" };
    if (jobType) where.jobType = jobType;
    if (experienceRequired) where.experienceRequired = experienceRequired;
    if (hasSalary === "true") where.salary = { [Op.ne]: null };
    if (location) where.location = { [Op.like]: `%${location}%` };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    if (q) where[Op.or] = [{ title: { [Op.like]: `%${q}%` } }, { description: { [Op.like]: `%${q}%` } }];

    // Any selected skill matches (OR) — the JSON array column has no native
    // Sequelize "contains one of" operator, so this ORs a JSON_CONTAINS per
    // skill (MySQL: candidate must be quoted JSON, i.e. '"Tajweed"').
    const skillList = skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (skillList.length) {
      where[Op.and] = [
        { [Op.or]: skillList.map((name) => sequelize.where(sequelize.fn("JSON_CONTAINS", sequelize.col("skills"), JSON.stringify(name)), true)) },
      ];
    }

    const limit = Math.min(Number(pageSize) || 12, 48);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await Job.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });
    const jobs = await Promise.all(rows.map(withCard));

    res.json({ jobs, total: count, page: Number(page) || 1, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicOne = async (req, res) => {
  try {
    const job = await Job.findOne({ where: { slug: req.params.slug, status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" } });
    if (!job) return res.status(404).json({ message: "Job not found." });

    const poster = await User.findByPk(job.userId, { attributes: ["id", "fullName", "profilePhoto", "locationCity", "locationCountry"] });

    res.json({ job, poster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
