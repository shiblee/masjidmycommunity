import { Op, fn, col } from "sequelize";
import ExperienceLevel from "../models/ExperienceLevel.js";
import Job from "../models/Job.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "experience-level";

async function usageCounts() {
  const rows = await Job.findAll({
    attributes: ["experienceRequired", [fn("COUNT", col("id")), "count"]],
    where: { experienceRequired: { [Op.ne]: null } },
    group: ["experienceRequired"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.experienceRequired, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const experienceLevels = await ExperienceLevel.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ experienceLevels: experienceLevels.map((s) => ({ ...s.toJSON(), usageCount: counts[s.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const experienceLevels = await ExperienceLevel.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ experienceLevels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Experience level name is required." });
    const maxOrder = (await ExperienceLevel.max("sortOrder")) || 0;
    const experienceLevel = await ExperienceLevel.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: experienceLevel.id,
      entityName: experienceLevel.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: experienceLevel.toJSON(),
    }).catch(() => {});
    res.status(201).json({ experienceLevel: { ...experienceLevel.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That experience level already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const experienceLevel = await ExperienceLevel.findByPk(req.params.id);
    if (!experienceLevel) return res.status(404).json({ message: "Experience level not found." });
    const before = { name: experienceLevel.name, isActive: experienceLevel.isActive, sortOrder: experienceLevel.sortOrder };
    if (req.body.name !== undefined) experienceLevel.name = req.body.name.trim();
    if (req.body.isActive !== undefined) experienceLevel.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) experienceLevel.sortOrder = req.body.sortOrder;
    await experienceLevel.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: experienceLevel.id,
      entityName: experienceLevel.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: experienceLevel.name },
        { field: "isActive", oldValue: before.isActive, newValue: experienceLevel.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: experienceLevel.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ experienceLevel: { ...experienceLevel.toJSON(), usageCount: counts[experienceLevel.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That experience level name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const experienceLevel = await ExperienceLevel.findByPk(req.params.id);
    if (!experienceLevel) return res.status(404).json({ message: "Experience level not found." });
    const snapshot = experienceLevel.toJSON();
    await experienceLevel.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: experienceLevel.id,
      entityName: snapshot.name,
      action: "delete",
      actor: await metaActorFrom(req),
      snapshot,
    }).catch(() => {});
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
