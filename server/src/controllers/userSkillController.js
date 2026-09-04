import Skill from "../models/Skill.js";
import UserSkill from "../models/UserSkill.js";
import { recordProfileChange } from "../utils/profileChangeLog.js";

const PROFICIENCIES = new Set(["beginner", "intermediate", "advanced", "expert"]);

async function serialize(entries) {
  const skillIds = entries.map((e) => e.skillId).filter(Boolean);
  const skills = skillIds.length ? await Skill.findAll({ where: { id: skillIds } }) : [];
  const skillById = Object.fromEntries(skills.map((s) => [s.id, s]));
  return entries.map((e) => ({
    ...e.toJSON(),
    name: e.skillId ? skillById[e.skillId]?.name || e.customName : e.customName,
  }));
}

export const listMasterSkills = async (req, res) => {
  try {
    const skills = await Skill.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ skills });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listMine = async (req, res) => {
  try {
    const entries = await UserSkill.findAll({ where: { userId: req.user.id }, order: [["sortOrder", "ASC"]] });
    res.json({ skills: await serialize(entries) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { skillId, proficiency } = req.body;
    if (!skillId) return res.status(400).json({ message: "Choose a skill from the list." });
    if (proficiency && !PROFICIENCIES.has(proficiency)) return res.status(400).json({ message: "Enter a valid proficiency level." });

    const skill = await Skill.findOne({ where: { id: skillId, isActive: true } });
    if (!skill) return res.status(404).json({ message: "Skill not found." });
    const existing = await UserSkill.findOne({ where: { userId: req.user.id, skillId } });
    if (existing) return res.status(409).json({ message: "You've already added this skill." });

    const maxOrder = (await UserSkill.max("sortOrder", { where: { userId: req.user.id } })) || 0;
    const entry = await UserSkill.create({
      userId: req.user.id,
      skillId,
      proficiency: proficiency || null,
      sortOrder: maxOrder + 1,
    });

    recordProfileChange({
      userId: req.user.id,
      section: "skill",
      action: "create",
      entityId: entry.id,
      actor: { type: "user", id: req.user.id, name: null },
      snapshot: entry.toJSON(),
    }).catch(() => {});

    const [serialized] = await serialize([entry]);
    res.status(201).json({ skill: serialized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const entry = await UserSkill.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!entry) return res.status(404).json({ message: "Skill not found." });
    const before = entry.proficiency;
    if (req.body.proficiency !== undefined) {
      if (req.body.proficiency && !PROFICIENCIES.has(req.body.proficiency)) return res.status(400).json({ message: "Enter a valid proficiency level." });
      entry.proficiency = req.body.proficiency || null;
    }
    await entry.save();

    if (String(before ?? "") !== String(entry.proficiency ?? "")) {
      recordProfileChange({
        userId: req.user.id,
        section: "skill",
        action: "update",
        entityId: entry.id,
        actor: { type: "user", id: req.user.id, name: null },
        fields: [{ field: "proficiency", oldValue: before, newValue: entry.proficiency }],
      }).catch(() => {});
    }

    const [serialized] = await serialize([entry]);
    res.json({ skill: serialized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const entry = await UserSkill.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!entry) return res.status(404).json({ message: "Skill not found." });
    const snapshot = entry.toJSON();
    await entry.destroy();

    recordProfileChange({
      userId: req.user.id,
      section: "skill",
      action: "delete",
      entityId: entry.id,
      actor: { type: "user", id: req.user.id, name: null },
      snapshot,
    }).catch(() => {});

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
