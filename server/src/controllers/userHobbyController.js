import Hobby from "../models/Hobby.js";
import UserHobby from "../models/UserHobby.js";
import { recordProfileChange } from "../utils/profileChangeLog.js";

async function serialize(entries) {
  const hobbyIds = entries.map((e) => e.hobbyId).filter(Boolean);
  const hobbies = hobbyIds.length ? await Hobby.findAll({ where: { id: hobbyIds } }) : [];
  const hobbyById = Object.fromEntries(hobbies.map((h) => [h.id, h]));
  return entries.map((e) => ({
    ...e.toJSON(),
    name: e.hobbyId ? hobbyById[e.hobbyId]?.name || e.customName : e.customName,
  }));
}

export const listMasterHobbies = async (req, res) => {
  try {
    const hobbies = await Hobby.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ hobbies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listMine = async (req, res) => {
  try {
    const entries = await UserHobby.findAll({ where: { userId: req.user.id }, order: [["sortOrder", "ASC"]] });
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
    const existing = await UserHobby.findOne({ where: { userId: req.user.id, hobbyId } });
    if (existing) return res.status(409).json({ message: "You've already added this hobby." });

    const maxOrder = (await UserHobby.max("sortOrder", { where: { userId: req.user.id } })) || 0;
    const entry = await UserHobby.create({
      userId: req.user.id,
      hobbyId,
      sortOrder: maxOrder + 1,
    });

    recordProfileChange({
      userId: req.user.id,
      section: "hobby",
      action: "create",
      entityId: entry.id,
      actor: { type: "user", id: req.user.id, name: null },
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
    const entry = await UserHobby.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!entry) return res.status(404).json({ message: "Hobby not found." });
    const snapshot = entry.toJSON();
    await entry.destroy();

    recordProfileChange({
      userId: req.user.id,
      section: "hobby",
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
