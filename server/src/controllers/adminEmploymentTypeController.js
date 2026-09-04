import { Op, fn, col } from "sequelize";
import EmploymentType from "../models/EmploymentType.js";
import WorkExperience from "../models/WorkExperience.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "employment-type";

async function usageCounts() {
  const rows = await WorkExperience.findAll({
    attributes: ["employmentType", [fn("COUNT", col("id")), "count"]],
    where: { employmentType: { [Op.ne]: null } },
    group: ["employmentType"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.employmentType, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const employmentTypes = await EmploymentType.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ employmentTypes: employmentTypes.map((s) => ({ ...s.toJSON(), usageCount: counts[s.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const employmentTypes = await EmploymentType.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ employmentTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Employment type name is required." });
    const maxOrder = (await EmploymentType.max("sortOrder")) || 0;
    const employmentType = await EmploymentType.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: employmentType.id,
      entityName: employmentType.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: employmentType.toJSON(),
    }).catch(() => {});
    res.status(201).json({ employmentType: { ...employmentType.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That employment type already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const employmentType = await EmploymentType.findByPk(req.params.id);
    if (!employmentType) return res.status(404).json({ message: "Employment type not found." });
    const before = { name: employmentType.name, isActive: employmentType.isActive, sortOrder: employmentType.sortOrder };
    if (req.body.name !== undefined) employmentType.name = req.body.name.trim();
    if (req.body.isActive !== undefined) employmentType.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) employmentType.sortOrder = req.body.sortOrder;
    await employmentType.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: employmentType.id,
      entityName: employmentType.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: employmentType.name },
        { field: "isActive", oldValue: before.isActive, newValue: employmentType.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: employmentType.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ employmentType: { ...employmentType.toJSON(), usageCount: counts[employmentType.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That employment type name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const employmentType = await EmploymentType.findByPk(req.params.id);
    if (!employmentType) return res.status(404).json({ message: "Employment type not found." });
    const snapshot = employmentType.toJSON();
    await employmentType.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: employmentType.id,
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
