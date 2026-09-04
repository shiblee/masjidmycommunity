import WorkExperience from "../models/WorkExperience.js";
import AdminUser from "../models/AdminUser.js";
import { recordProfileChange } from "../utils/profileChangeLog.js";
import { generateWorkExperienceEnhancement } from "../services/aiProviderService.js";

const SUPPORTED_LANGUAGES = new Set(["en", "hi", "ur", "ar"]);
const TRACKED_FIELDS = ["company", "title", "employmentType", "startDate", "endDate", "isCurrent", "location", "description", "achievements", "skillsUsed", "isActive"];
const MAX_ACHIEVEMENTS = 8;
const MAX_SKILLS = 12;

function sanitizeStringList(value, max) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

function diffValue(a, b) {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

async function actorFrom(req) {
  const admin = await AdminUser.findByPk(req.user.id, { attributes: ["name"] });
  return { type: "admin", id: req.user.id, name: admin?.name || null };
}

async function findOwned(req, res) {
  const entry = await WorkExperience.findOne({ where: { id: req.params.id, userId: req.params.userId } });
  if (!entry) {
    res.status(404).json({ message: "Work experience entry not found." });
    return null;
  }
  return entry;
}

export const list = async (req, res) => {
  try {
    const entries = await WorkExperience.findAll({ where: { userId: req.params.userId }, order: [["startDate", "DESC"]] });
    res.json({ workExperience: entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { company, title, employmentType, startDate, endDate, isCurrent, location, description, achievements, skillsUsed } = req.body;
    if (!company?.trim()) return res.status(400).json({ message: "Company or organization name is required." });
    if (!title?.trim()) return res.status(400).json({ message: "Job title is required." });
    if (!startDate) return res.status(400).json({ message: "Start date is required." });
    const nextEndDate = isCurrent ? null : endDate || null;
    if (nextEndDate && new Date(nextEndDate) < new Date(startDate)) {
      return res.status(400).json({ message: "End date can't be before the start date." });
    }

    const entry = await WorkExperience.create({
      userId: req.params.userId,
      company: company.trim(),
      title: title.trim(),
      employmentType: employmentType || null,
      startDate,
      endDate: nextEndDate,
      isCurrent: !!isCurrent,
      location: location?.trim() || null,
      description: description?.trim() || null,
      achievements: sanitizeStringList(achievements, MAX_ACHIEVEMENTS),
      skillsUsed: sanitizeStringList(skillsUsed, MAX_SKILLS),
    });

    recordProfileChange({
      userId: req.params.userId,
      section: "work_experience",
      action: "create",
      entityId: entry.id,
      actor: await actorFrom(req),
      snapshot: entry.toJSON(),
    }).catch(() => {});

    res.status(201).json({ workExperience: entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const entry = await findOwned(req, res);
    if (!entry) return;
    const before = Object.fromEntries(TRACKED_FIELDS.map((f) => [f, entry[f]]));

    if (req.body.company !== undefined) {
      if (!req.body.company.trim()) return res.status(400).json({ message: "Company or organization name is required." });
      entry.company = req.body.company.trim();
    }
    if (req.body.title !== undefined) {
      if (!req.body.title.trim()) return res.status(400).json({ message: "Job title is required." });
      entry.title = req.body.title.trim();
    }
    if (req.body.employmentType !== undefined) {
      entry.employmentType = req.body.employmentType || null;
    }
    if (req.body.startDate !== undefined) entry.startDate = req.body.startDate;
    if (req.body.isCurrent !== undefined) entry.isCurrent = !!req.body.isCurrent;
    entry.endDate = entry.isCurrent ? null : req.body.endDate !== undefined ? req.body.endDate || null : entry.endDate;
    if (entry.endDate && new Date(entry.endDate) < new Date(entry.startDate)) {
      return res.status(400).json({ message: "End date can't be before the start date." });
    }
    if (req.body.location !== undefined) entry.location = req.body.location?.trim() || null;
    if (req.body.description !== undefined) entry.description = req.body.description?.trim() || null;
    if (req.body.achievements !== undefined) entry.achievements = sanitizeStringList(req.body.achievements, MAX_ACHIEVEMENTS);
    if (req.body.skillsUsed !== undefined) entry.skillsUsed = sanitizeStringList(req.body.skillsUsed, MAX_SKILLS);
    if (req.body.isActive !== undefined) entry.isActive = !!req.body.isActive;

    await entry.save();

    const fields = TRACKED_FIELDS.filter((f) => diffValue(before[f], entry[f])).map((f) => ({
      field: f,
      oldValue: before[f],
      newValue: entry[f],
    }));
    if (fields.length) {
      recordProfileChange({
        userId: req.params.userId,
        section: "work_experience",
        action: "update",
        entityId: entry.id,
        actor: await actorFrom(req),
        fields,
      }).catch(() => {});
    }

    res.json({ workExperience: entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const entry = await findOwned(req, res);
    if (!entry) return;
    const snapshot = entry.toJSON();
    await entry.destroy();

    recordProfileChange({
      userId: req.params.userId,
      section: "work_experience",
      action: "delete",
      entityId: entry.id,
      actor: await actorFrom(req),
      snapshot,
    }).catch(() => {});

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const enhance = async (req, res) => {
  try {
    const { title, company, notes, languageCode } = req.body;
    if (!title?.trim() && !company?.trim()) {
      return res.status(400).json({ message: "Add a job title or company first, so the AI has something to work with." });
    }
    const lang = SUPPORTED_LANGUAGES.has(languageCode) ? languageCode : "en";
    const result = await generateWorkExperienceEnhancement({ title, company, notes, languageCode: lang });
    if (!result) return res.status(503).json({ message: "AI enhancement isn't available right now. Please try again later." });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
