import { Op, fn, col } from "sequelize";
import JobCategory from "../models/JobCategory.js";
import Job from "../models/Job.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "job-category";

async function usageCounts() {
  const rows = await Job.findAll({
    attributes: ["category", [fn("COUNT", col("id")), "count"]],
    where: { category: { [Op.ne]: null } },
    group: ["category"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const jobCategories = await JobCategory.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ jobCategories: jobCategories.map((c) => ({ ...c.toJSON(), usageCount: counts[c.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const jobCategories = await JobCategory.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ jobCategories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, icon, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Job category name is required." });
    const maxOrder = (await JobCategory.max("sortOrder")) || 0;
    const jobCategory = await JobCategory.create({
      name: name.trim(),
      icon: icon?.trim() || null,
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: jobCategory.id,
      entityName: jobCategory.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: jobCategory.toJSON(),
    }).catch(() => {});
    res.status(201).json({ jobCategory: { ...jobCategory.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That job category already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const jobCategory = await JobCategory.findByPk(req.params.id);
    if (!jobCategory) return res.status(404).json({ message: "Job category not found." });
    const before = { name: jobCategory.name, icon: jobCategory.icon, isActive: jobCategory.isActive, sortOrder: jobCategory.sortOrder };
    if (req.body.name !== undefined) jobCategory.name = req.body.name.trim();
    if (req.body.icon !== undefined) jobCategory.icon = req.body.icon?.trim() || null;
    if (req.body.isActive !== undefined) jobCategory.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) jobCategory.sortOrder = req.body.sortOrder;
    await jobCategory.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: jobCategory.id,
      entityName: jobCategory.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: jobCategory.name },
        { field: "icon", oldValue: before.icon, newValue: jobCategory.icon },
        { field: "isActive", oldValue: before.isActive, newValue: jobCategory.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: jobCategory.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ jobCategory: { ...jobCategory.toJSON(), usageCount: counts[jobCategory.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That job category name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const jobCategory = await JobCategory.findByPk(req.params.id);
    if (!jobCategory) return res.status(404).json({ message: "Job category not found." });
    const snapshot = jobCategory.toJSON();
    await jobCategory.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: jobCategory.id,
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
