import { Op, fn, col } from "sequelize";
import Skill from "../models/Skill.js";
import UserSkill from "../models/UserSkill.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "skill";

async function usageCounts() {
  const rows = await UserSkill.findAll({
    attributes: ["skillId", [fn("COUNT", col("id")), "count"]],
    where: { skillId: { [Op.ne]: null } },
    group: ["skillId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.skillId, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const skills = await Skill.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ skills: skills.map((s) => ({ ...s.toJSON(), usageCount: counts[s.id] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Skill name is required." });
    const maxOrder = (await Skill.max("sortOrder")) || 0;
    const skill = await Skill.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: skill.id,
      entityName: skill.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: skill.toJSON(),
    }).catch(() => {});
    res.status(201).json({ skill: { ...skill.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That skill already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const skill = await Skill.findByPk(req.params.id);
    if (!skill) return res.status(404).json({ message: "Skill not found." });
    const before = { name: skill.name, isActive: skill.isActive, sortOrder: skill.sortOrder };
    if (req.body.name !== undefined) skill.name = req.body.name.trim();
    if (req.body.isActive !== undefined) skill.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) skill.sortOrder = req.body.sortOrder;
    await skill.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: skill.id,
      entityName: skill.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: skill.name },
        { field: "isActive", oldValue: before.isActive, newValue: skill.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: skill.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ skill: { ...skill.toJSON(), usageCount: counts[skill.id] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That skill name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const skill = await Skill.findByPk(req.params.id);
    if (!skill) return res.status(404).json({ message: "Skill not found." });
    const snapshot = skill.toJSON();
    await skill.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: skill.id,
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
