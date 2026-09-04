import { Op, fn, col } from "sequelize";
import Degree from "../models/Degree.js";
import Education from "../models/Education.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "degree";

async function usageCounts() {
  const rows = await Education.findAll({
    attributes: ["degree", [fn("COUNT", col("id")), "count"]],
    where: { degree: { [Op.ne]: null } },
    group: ["degree"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.degree, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const degrees = await Degree.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ degrees: degrees.map((s) => ({ ...s.toJSON(), usageCount: counts[s.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const degrees = await Degree.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ degrees });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Degree name is required." });
    const maxOrder = (await Degree.max("sortOrder")) || 0;
    const degree = await Degree.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: degree.id,
      entityName: degree.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: degree.toJSON(),
    }).catch(() => {});
    res.status(201).json({ degree: { ...degree.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That degree already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const degree = await Degree.findByPk(req.params.id);
    if (!degree) return res.status(404).json({ message: "Degree not found." });
    const before = { name: degree.name, isActive: degree.isActive, sortOrder: degree.sortOrder };
    if (req.body.name !== undefined) degree.name = req.body.name.trim();
    if (req.body.isActive !== undefined) degree.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) degree.sortOrder = req.body.sortOrder;
    await degree.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: degree.id,
      entityName: degree.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: degree.name },
        { field: "isActive", oldValue: before.isActive, newValue: degree.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: degree.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ degree: { ...degree.toJSON(), usageCount: counts[degree.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That degree name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const degree = await Degree.findByPk(req.params.id);
    if (!degree) return res.status(404).json({ message: "Degree not found." });
    const snapshot = degree.toJSON();
    await degree.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: degree.id,
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
