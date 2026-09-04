import Skill from "../models/Skill.js";
import UserSkill from "../models/UserSkill.js";
import AdminUser from "../models/AdminUser.js";
import { recordProfileChange } from "../utils/profileChangeLog.js";

const PROFICIENCIES = new Set(["beginner", "intermediate", "advanced", "expert"]);

async function actorFrom(req) {
  const admin = await AdminUser.findByPk(req.user.id, { attributes: ["name"] });
  return { type: "admin", id: req.user.id, name: admin?.name || null };
}

async function serialize(entries) {
  const skillIds = entries.map((e) => e.skillId).filter(Boolean);
  const skills = skillIds.length ? await Skill.findAll({ where: { id: skillIds } }) : [];
  const skillById = Object.fromEntries(skills.map((s) => [s.id, s]));
  return entries.map((e) => ({
    ...e.toJSON(),
    name: e.skillId ? skillById[e.skillId]?.name || e.customName : e.customName,
  }));
}

export const list = async (req, res) => {
  try {
    const entries = await UserSkill.findAll({ where: { userId: req.params.userId }, order: [["sortOrder", "ASC"]] });
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
    const existing = await UserSkill.findOne({ where: { userId: req.params.userId, skillId } });
    if (existing) return res.status(409).json({ message: "This user already has this skill." });

    const maxOrder = (await UserSkill.max("sortOrder", { where: { userId: req.params.userId } })) || 0;
    const entry = await UserSkill.create({
      userId: req.params.userId,
      skillId,
      proficiency: proficiency || null,
      sortOrder: maxOrder + 1,
    });

    recordProfileChange({
      userId: req.params.userId,
      section: "skill",
      action: "create",
      entityId: entry.id,
      actor: await actorFrom(req),
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
    const entry = await UserSkill.findOne({ where: { id: req.params.id, userId: req.params.userId } });
    if (!entry) return res.status(404).json({ message: "Skill not found." });
    const before = entry.proficiency;
    if (req.body.proficiency !== undefined) {
      if (req.body.proficiency && !PROFICIENCIES.has(req.body.proficiency)) return res.status(400).json({ message: "Enter a valid proficiency level." });
      entry.proficiency = req.body.proficiency || null;
    }
    await entry.save();

    if (String(before ?? "") !== String(entry.proficiency ?? "")) {
      recordProfileChange({
        userId: req.params.userId,
        section: "skill",
        action: "update",
        entityId: entry.id,
        actor: await actorFrom(req),
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
    const entry = await UserSkill.findOne({ where: { id: req.params.id, userId: req.params.userId } });
    if (!entry) return res.status(404).json({ message: "Skill not found." });
    const snapshot = entry.toJSON();
    await entry.destroy();

    recordProfileChange({
      userId: req.params.userId,
      section: "skill",
      action: "delete",
      entityId: entry.id,
      actor: await actorFrom(req),
      snapshot,
    }).catch(() => {});

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
