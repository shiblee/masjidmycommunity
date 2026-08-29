import { Op, fn, col } from "sequelize";
import MasjidCategory from "../models/MasjidCategory.js";
import Masjid from "../models/Masjid.js";

async function categoryCountsByName() {
  const rows = await Masjid.findAll({
    attributes: ["category", [fn("COUNT", col("id")), "count"]],
    where: { category: { [Op.ne]: null } },
    group: ["category"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const categories = await MasjidCategory.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await categoryCountsByName();
    res.json({ categories: categories.map((c) => ({ ...c.toJSON(), masjidCount: counts[c.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Category name is required." });
    const maxOrder = (await MasjidCategory.max("sortOrder")) || 0;
    const category = await MasjidCategory.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    res.status(201).json({ category: { ...category.toJSON(), masjidCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That category already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const category = await MasjidCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    if (req.body.name !== undefined) category.name = req.body.name.trim();
    if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) category.sortOrder = req.body.sortOrder;
    await category.save();
    const counts = await categoryCountsByName();
    res.json({ category: { ...category.toJSON(), masjidCount: counts[category.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That category name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const category = await MasjidCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    await category.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
