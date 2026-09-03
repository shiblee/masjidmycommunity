import Faq from "../models/Faq.js";
import { FAQ_CATEGORIES } from "../constants/faqCategories.js";

export const list = async (req, res) => {
  try {
    const faqs = await Faq.findAll({ order: [["sortOrder", "ASC"]] });
    res.json({ faqs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listCategories = (req, res) => {
  res.json({ categories: FAQ_CATEGORIES });
};

export const create = async (req, res) => {
  try {
    const { category, question, answer, icon, isFeatured, isActive } = req.body;
    if (!category || !FAQ_CATEGORIES.includes(category)) return res.status(400).json({ message: "Please choose a valid category." });
    if (!question?.trim()) return res.status(400).json({ message: "Question is required." });
    if (!answer?.trim()) return res.status(400).json({ message: "Answer is required." });

    const maxOrder = (await Faq.max("sortOrder")) || 0;
    const faq = await Faq.create({
      category,
      question: question.trim(),
      answer: answer.trim(),
      icon: icon || null,
      isFeatured: Boolean(isFeatured),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    res.status(201).json({ faq });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const faq = await Faq.findByPk(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found." });

    if (req.body.category !== undefined) {
      if (!FAQ_CATEGORIES.includes(req.body.category)) return res.status(400).json({ message: "Please choose a valid category." });
      faq.category = req.body.category;
    }
    if (req.body.question !== undefined) faq.question = req.body.question.trim();
    if (req.body.answer !== undefined) faq.answer = req.body.answer.trim();
    if (req.body.icon !== undefined) faq.icon = req.body.icon || null;
    if (req.body.isFeatured !== undefined) faq.isFeatured = Boolean(req.body.isFeatured);
    if (req.body.isActive !== undefined) faq.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) faq.sortOrder = req.body.sortOrder;

    await faq.save();
    res.json({ faq });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const faq = await Faq.findByPk(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found." });
    await faq.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
