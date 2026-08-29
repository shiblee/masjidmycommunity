import WorkExperience from "../models/WorkExperience.js";

const EMPLOYMENT_TYPES = new Set(["full_time", "part_time", "internship", "contract", "freelance", "self_employed", "volunteer"]);

async function findOwned(req, res) {
  const entry = await WorkExperience.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!entry) {
    res.status(404).json({ message: "Work experience entry not found." });
    return null;
  }
  return entry;
}

export const list = async (req, res) => {
  try {
    const entries = await WorkExperience.findAll({ where: { userId: req.user.id }, order: [["startDate", "DESC"]] });
    res.json({ workExperience: entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { company, title, employmentType, startDate, endDate, isCurrent, location, description } = req.body;
    if (!company?.trim()) return res.status(400).json({ message: "Company or organization name is required." });
    if (!title?.trim()) return res.status(400).json({ message: "Job title is required." });
    if (!startDate) return res.status(400).json({ message: "Start date is required." });
    if (employmentType && !EMPLOYMENT_TYPES.has(employmentType)) return res.status(400).json({ message: "Enter a valid employment type." });

    const entry = await WorkExperience.create({
      userId: req.user.id,
      company: company.trim(),
      title: title.trim(),
      employmentType: employmentType || null,
      startDate,
      endDate: isCurrent ? null : endDate || null,
      isCurrent: !!isCurrent,
      location: location?.trim() || null,
      description: description?.trim() || null,
    });
    res.status(201).json({ workExperience: entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const entry = await findOwned(req, res);
    if (!entry) return;

    if (req.body.company !== undefined) {
      if (!req.body.company.trim()) return res.status(400).json({ message: "Company or organization name is required." });
      entry.company = req.body.company.trim();
    }
    if (req.body.title !== undefined) {
      if (!req.body.title.trim()) return res.status(400).json({ message: "Job title is required." });
      entry.title = req.body.title.trim();
    }
    if (req.body.employmentType !== undefined) {
      if (req.body.employmentType && !EMPLOYMENT_TYPES.has(req.body.employmentType)) return res.status(400).json({ message: "Enter a valid employment type." });
      entry.employmentType = req.body.employmentType || null;
    }
    if (req.body.startDate !== undefined) entry.startDate = req.body.startDate;
    if (req.body.isCurrent !== undefined) entry.isCurrent = !!req.body.isCurrent;
    entry.endDate = entry.isCurrent ? null : req.body.endDate !== undefined ? req.body.endDate || null : entry.endDate;
    if (req.body.location !== undefined) entry.location = req.body.location?.trim() || null;
    if (req.body.description !== undefined) entry.description = req.body.description?.trim() || null;

    await entry.save();
    res.json({ workExperience: entry });
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
