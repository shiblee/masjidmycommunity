import CampaignCategory from "../models/CampaignCategory.js";

export const list = async (req, res) => {
  try {
    const categories = await CampaignCategory.findAll({ order: [["sortOrder", "ASC"]] });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Category name is required." });
    const maxOrder = (await CampaignCategory.max("sortOrder")) || 0;
    const category = await CampaignCategory.create({ name: name.trim(), sortOrder: maxOrder + 1 });
    res.status(201).json({ category });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That category already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const category = await CampaignCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    if (req.body.name !== undefined) category.name = req.body.name.trim();
    if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) category.sortOrder = req.body.sortOrder;
    await category.save();
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const category = await CampaignCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found." });
    await category.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
