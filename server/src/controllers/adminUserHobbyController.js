import Hobby from "../models/Hobby.js";
import UserHobby from "../models/UserHobby.js";
import AdminUser from "../models/AdminUser.js";
import { recordProfileChange } from "../utils/profileChangeLog.js";

async function actorFrom(req) {
  const admin = await AdminUser.findByPk(req.user.id, { attributes: ["name"] });
  return { type: "admin", id: req.user.id, name: admin?.name || null };
}

async function serialize(entries) {
  const hobbyIds = entries.map((e) => e.hobbyId).filter(Boolean);
  const hobbies = hobbyIds.length ? await Hobby.findAll({ where: { id: hobbyIds } }) : [];
  const hobbyById = Object.fromEntries(hobbies.map((h) => [h.id, h]));
  return entries.map((e) => ({
    ...e.toJSON(),
    name: e.hobbyId ? hobbyById[e.hobbyId]?.name || e.customName : e.customName,
  }));
}

export const list = async (req, res) => {
  try {
    const entries = await UserHobby.findAll({ where: { userId: req.params.userId }, order: [["sortOrder", "ASC"]] });
    res.json({ hobbies: await serialize(entries) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { hobbyId } = req.body;
    if (!hobbyId) return res.status(400).json({ message: "Choose a hobby from the list." });

    const hobby = await Hobby.findOne({ where: { id: hobbyId, isActive: true } });
    if (!hobby) return res.status(404).json({ message: "Hobby not found." });
    const existing = await UserHobby.findOne({ where: { userId: req.params.userId, hobbyId } });
    if (existing) return res.status(409).json({ message: "This user already has this hobby." });

    const maxOrder = (await UserHobby.max("sortOrder", { where: { userId: req.params.userId } })) || 0;
    const entry = await UserHobby.create({
      userId: req.params.userId,
      hobbyId,
      sortOrder: maxOrder + 1,
    });

    recordProfileChange({
      userId: req.params.userId,
      section: "hobby",
      action: "create",
      entityId: entry.id,
      actor: await actorFrom(req),
      snapshot: entry.toJSON(),
    }).catch(() => {});

    const [serialized] = await serialize([entry]);
    res.status(201).json({ hobby: serialized });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const entry = await UserHobby.findOne({ where: { id: req.params.id, userId: req.params.userId } });
    if (!entry) return res.status(404).json({ message: "Hobby not found." });
    const snapshot = entry.toJSON();
    await entry.destroy();

    recordProfileChange({
      userId: req.params.userId,
      section: "hobby",
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
