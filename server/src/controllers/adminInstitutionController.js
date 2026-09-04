import { Op, fn, col } from "sequelize";
import Institution from "../models/Institution.js";
import Education from "../models/Education.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "institution";

async function usageCounts() {
  const rows = await Education.findAll({
    attributes: ["institution", [fn("COUNT", col("id")), "count"]],
    where: { institution: { [Op.ne]: null } },
    group: ["institution"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.institution, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const institutions = await Institution.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ institutions: institutions.map((s) => ({ ...s.toJSON(), usageCount: counts[s.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const institutions = await Institution.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ institutions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Institution name is required." });
    const maxOrder = (await Institution.max("sortOrder")) || 0;
    const institution = await Institution.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: institution.id,
      entityName: institution.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: institution.toJSON(),
    }).catch(() => {});
    res.status(201).json({ institution: { ...institution.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That institution already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const institution = await Institution.findByPk(req.params.id);
    if (!institution) return res.status(404).json({ message: "Institution not found." });
    const before = { name: institution.name, isActive: institution.isActive, sortOrder: institution.sortOrder };
    if (req.body.name !== undefined) institution.name = req.body.name.trim();
    if (req.body.isActive !== undefined) institution.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) institution.sortOrder = req.body.sortOrder;
    await institution.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: institution.id,
      entityName: institution.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: institution.name },
        { field: "isActive", oldValue: before.isActive, newValue: institution.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: institution.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ institution: { ...institution.toJSON(), usageCount: counts[institution.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That institution name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const institution = await Institution.findByPk(req.params.id);
    if (!institution) return res.status(404).json({ message: "Institution not found." });
    const snapshot = institution.toJSON();
    await institution.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: institution.id,
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
