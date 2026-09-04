import { Op, fn, col } from "sequelize";
import EducationLevel from "../models/EducationLevel.js";
import Education from "../models/Education.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "education-level";

async function usageCounts() {
  const rows = await Education.findAll({
    attributes: ["level", [fn("COUNT", col("id")), "count"]],
    where: { level: { [Op.ne]: null } },
    group: ["level"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.level, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const educationLevels = await EducationLevel.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ educationLevels: educationLevels.map((s) => ({ ...s.toJSON(), usageCount: counts[s.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const educationLevels = await EducationLevel.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ educationLevels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Education level name is required." });
    const maxOrder = (await EducationLevel.max("sortOrder")) || 0;
    const educationLevel = await EducationLevel.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: educationLevel.id,
      entityName: educationLevel.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: educationLevel.toJSON(),
    }).catch(() => {});
    res.status(201).json({ educationLevel: { ...educationLevel.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That education level already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const educationLevel = await EducationLevel.findByPk(req.params.id);
    if (!educationLevel) return res.status(404).json({ message: "Education level not found." });
    const before = { name: educationLevel.name, isActive: educationLevel.isActive, sortOrder: educationLevel.sortOrder };
    if (req.body.name !== undefined) educationLevel.name = req.body.name.trim();
    if (req.body.isActive !== undefined) educationLevel.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) educationLevel.sortOrder = req.body.sortOrder;
    await educationLevel.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: educationLevel.id,
      entityName: educationLevel.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: educationLevel.name },
        { field: "isActive", oldValue: before.isActive, newValue: educationLevel.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: educationLevel.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ educationLevel: { ...educationLevel.toJSON(), usageCount: counts[educationLevel.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That education level name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const educationLevel = await EducationLevel.findByPk(req.params.id);
    if (!educationLevel) return res.status(404).json({ message: "Education level not found." });
    const snapshot = educationLevel.toJSON();
    await educationLevel.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: educationLevel.id,
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
