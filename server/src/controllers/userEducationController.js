import Education from "../models/Education.js";

const LEVELS = new Set(["secondary", "senior_secondary", "diploma", "bachelors", "masters", "doctorate", "certificate", "other"]);

async function findOwned(req, res) {
  const entry = await Education.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!entry) {
    res.status(404).json({ message: "Education entry not found." });
    return null;
  }
  return entry;
}

export const list = async (req, res) => {
  try {
    const entries = await Education.findAll({
      where: { userId: req.user.id },
      order: [
        ["endYear", "DESC"],
        ["startYear", "DESC"],
      ],
    });
    res.json({ education: entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { level, degree, institution, fieldOfStudy, startYear, endYear, location, description } = req.body;
    if (!degree?.trim()) return res.status(400).json({ message: "Degree or qualification is required." });
    if (!institution?.trim()) return res.status(400).json({ message: "Institution or university is required." });
    if (level && !LEVELS.has(level)) return res.status(400).json({ message: "Enter a valid education level." });

    const entry = await Education.create({
      userId: req.user.id,
      level: level || null,
      degree: degree.trim(),
      institution: institution.trim(),
      fieldOfStudy: fieldOfStudy?.trim() || null,
      startYear: startYear || null,
      endYear: endYear || null,
      location: location?.trim() || null,
      description: description?.trim() || null,
    });
    res.status(201).json({ education: entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const entry = await findOwned(req, res);
    if (!entry) return;

    if (req.body.level !== undefined) {
      if (req.body.level && !LEVELS.has(req.body.level)) return res.status(400).json({ message: "Enter a valid education level." });
      entry.level = req.body.level || null;
    }
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
    if (req.body.endYear !== undefined) entry.endYear = req.body.endYear || null;
    if (req.body.location !== undefined) entry.location = req.body.location?.trim() || null;
    if (req.body.description !== undefined) entry.description = req.body.description?.trim() || null;

    await entry.save();
    res.json({ education: entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const entry = await findOwned(req, res);
    if (!entry) return;
    await entry.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
