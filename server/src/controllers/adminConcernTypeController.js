import { fn, col } from "sequelize";
import ConcernType from "../models/ConcernType.js";
import Concern from "../models/Concern.js";

async function concernCountsByType() {
  const rows = await Concern.findAll({
    attributes: ["concernType", [fn("COUNT", col("id")), "count"]],
    group: ["concernType"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.concernType, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const types = await ConcernType.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await concernCountsByType();
    res.json({ types: types.map((t) => ({ ...t.toJSON(), concernCount: counts[t.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Concern type name is required." });
    const maxOrder = (await ConcernType.max("sortOrder")) || 0;
    const type = await ConcernType.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    res.status(201).json({ type: { ...type.toJSON(), concernCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That concern type already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const type = await ConcernType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ message: "Concern type not found." });
    if (req.body.name !== undefined) type.name = req.body.name.trim();
    if (req.body.isActive !== undefined) type.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) type.sortOrder = req.body.sortOrder;
    await type.save();
    const counts = await concernCountsByType();
    res.json({ type: { ...type.toJSON(), concernCount: counts[type.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That concern type name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const type = await ConcernType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ message: "Concern type not found." });
    await type.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
