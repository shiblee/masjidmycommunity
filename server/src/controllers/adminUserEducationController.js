import Education from "../models/Education.js";
import AdminUser from "../models/AdminUser.js";
import { recordProfileChange } from "../utils/profileChangeLog.js";
import { generateEducationEnhancement } from "../services/aiProviderService.js";

const MAX_DESCRIPTION = 1000;
const TRACKED_FIELDS = ["level", "degree", "institution", "fieldOfStudy", "startYear", "endYear", "isCurrentlyStudying", "location", "description", "isActive"];
const SUPPORTED_LANGUAGES = new Set(["en", "hi", "ur", "ar"]);

function diffValue(a, b) {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

function validateYearsAndDescription({ startYear, endYear, isCurrentlyStudying, description }) {
  if (!startYear) return "Start year is required.";
  const nextEndYear = isCurrentlyStudying ? null : endYear || null;
  if (nextEndYear && Number(nextEndYear) < Number(startYear)) return "End year can't be before the start year.";
  if (description && description.length > MAX_DESCRIPTION) return `Description must be ${MAX_DESCRIPTION} characters or fewer.`;
  return null;
}

async function actorFrom(req) {
  const admin = await AdminUser.findByPk(req.user.id, { attributes: ["name"] });
  return { type: "admin", id: req.user.id, name: admin?.name || null };
}

async function findOwned(req, res) {
  const entry = await Education.findOne({ where: { id: req.params.id, userId: req.params.userId } });
  if (!entry) {
    res.status(404).json({ message: "Education entry not found." });
    return null;
  }
  return entry;
}

export const list = async (req, res) => {
  try {
    const entries = await Education.findAll({
      where: { userId: req.params.userId },
      order: [["endYear", "DESC"], ["startYear", "DESC"]],
    });
    res.json({ education: entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { level, degree, institution, fieldOfStudy, startYear, endYear, isCurrentlyStudying, location, description } = req.body;
    if (!degree?.trim()) return res.status(400).json({ message: "Degree or qualification is required." });
    if (!institution?.trim()) return res.status(400).json({ message: "Institution or university is required." });
    const validationError = validateYearsAndDescription({ startYear, endYear, isCurrentlyStudying, description });
    if (validationError) return res.status(400).json({ message: validationError });

    const entry = await Education.create({
      userId: req.params.userId,
      level: level?.trim() || null,
      degree: degree.trim(),
      institution: institution.trim(),
      fieldOfStudy: fieldOfStudy?.trim() || null,
      startYear: startYear || null,
      endYear: isCurrentlyStudying ? null : endYear || null,
      isCurrentlyStudying: !!isCurrentlyStudying,
      location: location?.trim() || null,
      description: description?.trim() || null,
    });

    recordProfileChange({
      userId: req.params.userId,
      section: "education",
      action: "create",
      entityId: entry.id,
      actor: await actorFrom(req),
      snapshot: entry.toJSON(),
    }).catch(() => {});

    res.status(201).json({ education: entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const entry = await findOwned(req, res);
    if (!entry) return;
    const before = Object.fromEntries(TRACKED_FIELDS.map((f) => [f, entry[f]]));

    if (req.body.level !== undefined) entry.level = req.body.level?.trim() || null;
    if (req.body.degree !== undefined) {
      if (!req.body.degree.trim()) return res.status(400).json({ message: "Degree or qualification is required." });
      entry.degree = req.body.degree.trim();
    }
    if (req.body.institution !== undefined) {
      if (!req.body.institution.trim()) return res.status(400).json({ message: "Institution or university is required." });
      entry.institution = req.body.institution.trim();
    }
    if (req.body.fieldOfStudy !== undefined) entry.fieldOfStudy = req.body.fieldOfStudy?.trim() || null;
    if (req.body.startYear !== undefined) entry.startYear = req.body.startYear || null;
    if (req.body.isCurrentlyStudying !== undefined) entry.isCurrentlyStudying = !!req.body.isCurrentlyStudying;
    entry.endYear = entry.isCurrentlyStudying ? null : req.body.endYear !== undefined ? req.body.endYear || null : entry.endYear;
    if (req.body.location !== undefined) entry.location = req.body.location?.trim() || null;
    if (req.body.description !== undefined) entry.description = req.body.description?.trim() || null;
    if (req.body.isActive !== undefined) entry.isActive = !!req.body.isActive;

    const validationError = validateYearsAndDescription({
      startYear: entry.startYear,
      endYear: entry.endYear,
      isCurrentlyStudying: entry.isCurrentlyStudying,
      description: entry.description,
    });
    if (validationError) return res.status(400).json({ message: validationError });

    await entry.save();

    const fields = TRACKED_FIELDS.filter((f) => diffValue(before[f], entry[f])).map((f) => ({
      field: f,
      oldValue: before[f],
      newValue: entry[f],
    }));
    if (fields.length) {
      recordProfileChange({
        userId: req.params.userId,
        section: "education",
        action: "update",
        entityId: entry.id,
        actor: await actorFrom(req),
        fields,
      }).catch(() => {});
    }

    res.json({ education: entry });
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
      section: "education",
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
    const { level, degree, institution, fieldOfStudy, notes, languageCode } = req.body;
    if (!degree?.trim() && !institution?.trim()) {
      return res.status(400).json({ message: "Add a degree or institution first, so the AI has something to work with." });
    }
    const lang = SUPPORTED_LANGUAGES.has(languageCode) ? languageCode : "en";
    const result = await generateEducationEnhancement({ level, degree, institution, fieldOfStudy, notes, languageCode: lang });
    if (!result) return res.status(503).json({ message: "AI enhancement isn't available right now. Please try again later." });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
