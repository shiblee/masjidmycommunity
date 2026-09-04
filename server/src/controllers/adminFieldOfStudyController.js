import { Op, fn, col } from "sequelize";
import FieldOfStudy from "../models/FieldOfStudy.js";
import Education from "../models/Education.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "field-of-study";

async function usageCounts() {
  const rows = await Education.findAll({
    attributes: ["fieldOfStudy", [fn("COUNT", col("id")), "count"]],
    where: { fieldOfStudy: { [Op.ne]: null } },
    group: ["fieldOfStudy"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.fieldOfStudy, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const fieldsOfStudy = await FieldOfStudy.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ fieldsOfStudy: fieldsOfStudy.map((s) => ({ ...s.toJSON(), usageCount: counts[s.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const fieldsOfStudy = await FieldOfStudy.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ fieldsOfStudy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Field of study name is required." });
    const maxOrder = (await FieldOfStudy.max("sortOrder")) || 0;
    const fieldOfStudy = await FieldOfStudy.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: fieldOfStudy.id,
      entityName: fieldOfStudy.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: fieldOfStudy.toJSON(),
    }).catch(() => {});
    res.status(201).json({ fieldOfStudy: { ...fieldOfStudy.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That field of study already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const fieldOfStudy = await FieldOfStudy.findByPk(req.params.id);
    if (!fieldOfStudy) return res.status(404).json({ message: "Field of study not found." });
    const before = { name: fieldOfStudy.name, isActive: fieldOfStudy.isActive, sortOrder: fieldOfStudy.sortOrder };
    if (req.body.name !== undefined) fieldOfStudy.name = req.body.name.trim();
    if (req.body.isActive !== undefined) fieldOfStudy.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) fieldOfStudy.sortOrder = req.body.sortOrder;
    await fieldOfStudy.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: fieldOfStudy.id,
      entityName: fieldOfStudy.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: fieldOfStudy.name },
        { field: "isActive", oldValue: before.isActive, newValue: fieldOfStudy.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: fieldOfStudy.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ fieldOfStudy: { ...fieldOfStudy.toJSON(), usageCount: counts[fieldOfStudy.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That field of study name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const fieldOfStudy = await FieldOfStudy.findByPk(req.params.id);
    if (!fieldOfStudy) return res.status(404).json({ message: "Field of study not found." });
    const snapshot = fieldOfStudy.toJSON();
    await fieldOfStudy.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: fieldOfStudy.id,
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
