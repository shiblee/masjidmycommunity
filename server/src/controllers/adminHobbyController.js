import { Op, fn, col } from "sequelize";
import Hobby from "../models/Hobby.js";
import UserHobby from "../models/UserHobby.js";

async function usageCounts() {
  const rows = await UserHobby.findAll({
    attributes: ["hobbyId", [fn("COUNT", col("id")), "count"]],
    where: { hobbyId: { [Op.ne]: null } },
    group: ["hobbyId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.hobbyId, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const hobbies = await Hobby.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ hobbies: hobbies.map((h) => ({ ...h.toJSON(), usageCount: counts[h.id] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Hobby name is required." });
    const maxOrder = (await Hobby.max("sortOrder")) || 0;
    const hobby = await Hobby.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    res.status(201).json({ hobby: { ...hobby.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That hobby already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const hobby = await Hobby.findByPk(req.params.id);
    if (!hobby) return res.status(404).json({ message: "Hobby not found." });
    if (req.body.name !== undefined) hobby.name = req.body.name.trim();
    if (req.body.isActive !== undefined) hobby.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) hobby.sortOrder = req.body.sortOrder;
    await hobby.save();
    const counts = await usageCounts();
    res.json({ hobby: { ...hobby.toJSON(), usageCount: counts[hobby.id] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That hobby name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const hobby = await Hobby.findByPk(req.params.id);
    if (!hobby) return res.status(404).json({ message: "Hobby not found." });
    await hobby.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
