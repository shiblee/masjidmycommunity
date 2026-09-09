import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import EmploymentType from "../models/EmploymentType.js";
import ExperienceLevel from "../models/ExperienceLevel.js";
import Skill from "../models/Skill.js";
import JobCategory from "../models/JobCategory.js";
import JobFavorite from "../models/JobFavorite.js";
import { getUserMatchProfile, computeMatchScore } from "../services/jobMatchingService.js";
import { resolveSearchFilters } from "../services/jobSearchService.js";
import { aiProviderConfigured } from "../services/aiProviderService.js";

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

export const listJobCategories = async (req, res) => {
  try {
    const jobCategories = await JobCategory.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ jobCategories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const PUBLIC_STATUSES = ["active"];
const MAP_POINTS_CAP = 300;

async function withCard(job, { favoritedIds, matchProfile } = {}) {
  const poster = await User.findByPk(job.userId, { attributes: ["id", "fullName", "locationCity", "locationCountry"] });
  const match = matchProfile ? computeMatchScore(job, matchProfile) : null;
  return {
    id: job.id,
    slug: job.slug,
    title: job.title,
    jobType: job.jobType,
    experienceRequired: job.experienceRequired,
    category: job.category,
    workMode: job.workMode,
    skills: job.skills || [],
    location: job.location,
    latitude: job.latitude != null ? Number(job.latitude) : null,
    longitude: job.longitude != null ? Number(job.longitude) : null,
    salary: job.salary,
    applicationDeadline: job.applicationDeadline,
    applicantCount: job.applicationCount,
    createdAt: job.createdAt,
    postedBy: poster?.fullName || "A community member",
    ...(favoritedIds ? { favorited: favoritedIds.has(job.id) } : {}),
    ...(match ? { matchScore: match.score, matchedSkills: match.matchedSkills } : {}),
  };
}

// Batches one query for however many jobs are on the current page/response,
// rather than a favorite lookup per card — same shape as MasjidFavorite's
// own per-page batching would be, just simpler since jobs have no engagement
// aggregation step of their own to piggyback on.
async function getFavoritedIds(userId, jobIds) {
  if (!userId || !jobIds.length) return new Set();
  const rows = await JobFavorite.findAll({ where: { userId, jobId: { [Op.in]: jobIds } }, attributes: ["jobId"] });
  return new Set(rows.map((r) => r.jobId));
}

export const listPublic = async (req, res) => {
  try {
    const { q, jobType, experienceRequired, category, workMode, hasSalary, skills, location, excludeId, sort, nlQuery, lang, skipLocation, lat, lng, page = 1, pageSize = 12 } = req.query;
    const where = { status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" };

    // Natural-language search — parses free text into structured filters
    // (jobSearchService.js), applied only where the caller hasn't already
    // set an explicit filter of that kind. Unconfigured/failed AI falls back
    // to treating nlQuery as plain keyword text, same as `q` — search never
    // breaks, it just loses the natural-language understanding.
    let appliedFilters = null;
    let nlFallbackKeyword = null;
    if (nlQuery?.trim()) {
      if (aiProviderConfigured) {
        const resolved = await resolveSearchFilters({ nlQuery, languageCode: lang || "en" });
        if (resolved) appliedFilters = resolved;
        else nlFallbackKeyword = nlQuery.trim();
      } else {
        nlFallbackKeyword = nlQuery.trim();
      }
    }
    if (skipLocation === "true" && appliedFilters) appliedFilters = { ...appliedFilters, location: null };

    const effectiveJobType = jobType || appliedFilters?.jobType;
    const effectiveExperience = experienceRequired || appliedFilters?.experienceLevel;
    const effectiveWorkMode = workMode || appliedFilters?.workMode;
    const effectiveLocation = skipLocation === "true" ? location : location || appliedFilters?.location;

    if (effectiveJobType) where.jobType = jobType ? jobType : { [Op.like]: `%${effectiveJobType}%` };
    if (effectiveExperience) where.experienceRequired = experienceRequired ? experienceRequired : { [Op.like]: `%${effectiveExperience}%` };
    if (category) where.category = category;
    if (effectiveWorkMode) where.workMode = effectiveWorkMode;
    if (hasSalary === "true") where.salary = { [Op.ne]: null };
    if (effectiveLocation) where.location = { [Op.like]: `%${effectiveLocation}%` };
    if (excludeId) where.id = { [Op.ne]: excludeId };

    const keywordText = q || nlFallbackKeyword || (appliedFilters?.keywords || []).join(" ");
    if (keywordText) where[Op.or] = [{ title: { [Op.like]: `%${keywordText}%` } }, { description: { [Op.like]: `%${keywordText}%` } }];

    // Any selected skill matches (OR) — the JSON array column has no native
    // Sequelize "contains one of" operator, so this ORs a JSON_CONTAINS per
    // skill (MySQL: candidate must be quoted JSON, i.e. '"Tajweed"').
    const skillList = skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : appliedFilters?.skills || [];
    if (skillList.length) {
      where[Op.and] = [
        { [Op.or]: skillList.map((name) => sequelize.where(sequelize.fn("JSON_CONTAINS", sequelize.col("skills"), JSON.stringify(name)), true)) },
      ];
    }

    // "Closing Soon" — only jobs with a real deadline still in the future,
    // soonest first. A DB-level sort/filter (unlike match score), so it
    // stays correct across pagination.
    let order = [["createdAt", "DESC"]];
    if (sort === "deadline") {
      where.applicationDeadline = { [Op.ne]: null, [Op.gte]: new Date().toISOString().slice(0, 10) };
      order = [["applicationDeadline", "ASC"]];
    }

    // "Near You" — same server-side haversine `literal()` pattern
    // publicMasjidController.js already uses, reused as-is for jobs.
    const latNum = Number(lat), lngNum = Number(lng);
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);
    let distanceAttr = null;
    if (hasCoords) {
      distanceAttr = sequelize.literal(
        `(6371 * acos(cos(radians(${latNum})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lngNum})) + sin(radians(${latNum})) * sin(radians(latitude))))`
      );
      if (sort === "distance") {
        where.latitude = { [Op.ne]: null };
        where.longitude = { [Op.ne]: null };
        order = [[distanceAttr, "ASC"]];
      }
    }

    const limit = Math.min(Number(pageSize) || 12, 48);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const findOptions = { where, order, limit, offset };
    if (distanceAttr) findOptions.attributes = { include: [[distanceAttr, "distanceKm"]] };

    const { rows, count } = await Job.findAndCountAll(findOptions);
    const [favoritedIds, matchProfile] = await Promise.all([
      getFavoritedIds(req.user?.id, rows.map((j) => j.id)),
      req.user?.id ? getUserMatchProfile(req.user.id) : null,
    ]);
    const jobs = await Promise.all(
      rows.map((j) => withCard(j, { favoritedIds, matchProfile }).then((card) => ({
        ...card,
        ...(hasCoords && j.dataValues.distanceKm != null ? { distanceKm: Number(j.dataValues.distanceKm) } : {}),
      })))
    );

    res.json({ jobs, total: count, page: Number(page) || 1, pageSize: limit, appliedFilters });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** All currently-open, geocoded jobs (capped), for the Jobs page's Map view —
 * mirrors publicMasjidController.js's listMapPoints exactly: no pagination,
 * a straight cap, since a map wants every point at once rather than pages. */
export const listMapPoints = async (req, res) => {
  try {
    const { q, category } = req.query;
    const where = { status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active", latitude: { [Op.ne]: null }, longitude: { [Op.ne]: null } };
    if (category) where.category = category;
    if (q) where[Op.or] = [{ title: { [Op.like]: `%${q}%` } }, { description: { [Op.like]: `%${q}%` } }];

    const rows = await Job.findAll({ where, order: [["createdAt", "DESC"]], limit: MAP_POINTS_CAP });
    const jobs = await Promise.all(rows.map((j) => withCard(j)));
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicOne = async (req, res) => {
  try {
    const job = await Job.findOne({ where: { slug: req.params.slug, status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" } });
    if (!job) return res.status(404).json({ message: "Job not found." });

    const poster = await User.findByPk(job.userId, { attributes: ["id", "fullName", "profilePhoto", "locationCity", "locationCountry"] });
    const [favoritedIds, matchProfile] = await Promise.all([
      getFavoritedIds(req.user?.id, [job.id]),
      req.user?.id ? getUserMatchProfile(req.user.id) : null,
    ]);
    const match = matchProfile ? computeMatchScore(job, matchProfile) : null;

    res.json({
      job: { ...job.toJSON(), favorited: favoritedIds.has(job.id), ...(match ? { matchScore: match.score, matchedSkills: match.matchedSkills } : {}) },
      poster,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Top matches for the current user among currently-open jobs — powers
 * "Recommended for You" / "Best Matches". Scores a bounded recent pool
 * (matching an entire growing board per request isn't necessary — a
 * meaningful match is almost always recent) rather than the whole table. */
export const listRecommended = async (req, res) => {
  try {
    const matchProfile = await getUserMatchProfile(req.user.id);
    const limit = Math.min(Number(req.query.limit) || 10, 24);
    const pool = await Job.findAll({
      where: { status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active", userId: { [Op.ne]: req.user.id } },
      order: [["createdAt", "DESC"]],
      limit: 150,
    });
    const scored = pool
      .map((job) => ({ job, match: computeMatchScore(job, matchProfile) }))
      .filter((r) => r.match && r.match.score >= 40)
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, limit);

    const favoritedIds = await getFavoritedIds(req.user.id, scored.map((r) => r.job.id));
    const jobs = await Promise.all(scored.map((r) => withCard(r.job, { favoritedIds, matchProfile })));
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Jobs sharing at least one skill with the current user's profile —
 * powers "Based on Your Skills", ordered by how many skills overlap. */
export const listBySkills = async (req, res) => {
  try {
    const matchProfile = await getUserMatchProfile(req.user.id);
    const limit = Math.min(Number(req.query.limit) || 10, 24);
    if (!matchProfile.skillNames.size) return res.json({ jobs: [] });

    const pool = await Job.findAll({
      where: { status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active", userId: { [Op.ne]: req.user.id } },
      order: [["createdAt", "DESC"]],
      limit: 150,
    });
    const scored = pool
      .map((job) => ({ job, match: computeMatchScore(job, matchProfile) }))
      .filter((r) => r.match && r.match.matchedSkills.length > 0)
      .sort((a, b) => b.match.matchedSkills.length - a.match.matchedSkills.length)
      .slice(0, limit);

    const favoritedIds = await getFavoritedIds(req.user.id, scored.map((r) => r.job.id));
    const jobs = await Promise.all(scored.map((r) => withCard(r.job, { favoritedIds, matchProfile })));
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** The current user's saved (favorited) jobs, most-recently-saved first —
 * powers the Jobs page's "Saved Jobs" rail and a dedicated Saved Jobs list.
 * Filters out any job that's no longer public before paginating, mirroring
 * publicMasjidController.js's listMyLiked exactly. */
export const listMyLiked = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.pageSize) || 12, 48);

    const favorites = await JobFavorite.findAll({ where: { userId }, order: [["createdAt", "DESC"]] });
    const jobRows = favorites.length
      ? await Job.findAll({ where: { id: favorites.map((f) => f.jobId), status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" } })
      : [];
    const byId = new Map(jobRows.map((j) => [j.id, j]));
    const ordered = favorites.map((f) => byId.get(f.jobId)).filter(Boolean);

    const total = ordered.length;
    const pageRows = ordered.slice((page - 1) * limit, page * limit);
    const favoritedIds = new Set(pageRows.map((j) => j.id));
    const jobs = await Promise.all(pageRows.map((j) => withCard(j, { favoritedIds })));

    res.json({ jobs, total, page, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
