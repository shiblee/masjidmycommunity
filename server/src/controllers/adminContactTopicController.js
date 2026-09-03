import { fn, col } from "sequelize";
import ContactTopic from "../models/ContactTopic.js";
import ContactMessage from "../models/ContactMessage.js";

async function contactCountsByTopic() {
  const rows = await ContactMessage.findAll({
    attributes: ["topic", [fn("COUNT", col("id")), "count"]],
    group: ["topic"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.topic, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const topics = await ContactTopic.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await contactCountsByTopic();
    res.json({ topics: topics.map((t) => ({ ...t.toJSON(), contactCount: counts[t.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, icon, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Topic name is required." });
    const maxOrder = (await ContactTopic.max("sortOrder")) || 0;
    const topic = await ContactTopic.create({
      name: name.trim(),
      icon: icon || "compass",
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    res.status(201).json({ topic: { ...topic.toJSON(), contactCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That topic already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const topic = await ContactTopic.findByPk(req.params.id);
    if (!topic) return res.status(404).json({ message: "Topic not found." });
    if (req.body.name !== undefined) topic.name = req.body.name.trim();
    if (req.body.icon !== undefined) topic.icon = req.body.icon;
    if (req.body.isActive !== undefined) topic.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) topic.sortOrder = req.body.sortOrder;
    await topic.save();
    const counts = await contactCountsByTopic();
    res.json({ topic: { ...topic.toJSON(), contactCount: counts[topic.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That topic name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const topic = await ContactTopic.findByPk(req.params.id);
    if (!topic) return res.status(404).json({ message: "Topic not found." });
    await topic.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
