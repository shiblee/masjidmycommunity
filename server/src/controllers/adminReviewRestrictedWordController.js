import ReviewRestrictedWord from "../models/ReviewRestrictedWord.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "review-restricted-word";
const CATEGORIES = ["Vulgar/Abusive", "Sexual/Explicit", "Hate/Harassment", "Threatening", "Offensive", "Other"];
const LANGUAGES = ["en", "hi", "ur", "ar", "other"];

export const list = async (req, res) => {
  try {
    const words = await ReviewRestrictedWord.findAll({ order: [["term", "ASC"]] });
    res.json({ words });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { term, category, language, isActive } = req.body;
    if (!term?.trim()) return res.status(400).json({ message: "A term or phrase is required." });
    if (category && !CATEGORIES.includes(category)) return res.status(400).json({ message: "Invalid category." });
    if (language && !LANGUAGES.includes(language)) return res.status(400).json({ message: "Invalid language." });

    const word = await ReviewRestrictedWord.create({
      term: term.trim().toLowerCase(),
      category: category || "Other",
      language: language || "en",
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: word.id,
      entityName: word.term,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: word.toJSON(),
    }).catch(() => {});
    res.status(201).json({ word });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That term already exists for this language." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const word = await ReviewRestrictedWord.findByPk(req.params.id);
    if (!word) return res.status(404).json({ message: "Term not found." });
    const before = { term: word.term, category: word.category, language: word.language, isActive: word.isActive };
    if (req.body.term !== undefined) word.term = req.body.term.trim().toLowerCase();
    if (req.body.category !== undefined) word.category = req.body.category;
    if (req.body.language !== undefined) word.language = req.body.language;
    if (req.body.isActive !== undefined) word.isActive = req.body.isActive;
    await word.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: word.id,
      entityName: word.term,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "term", oldValue: before.term, newValue: word.term },
        { field: "category", oldValue: before.category, newValue: word.category },
        { field: "language", oldValue: before.language, newValue: word.language },
        { field: "isActive", oldValue: before.isActive, newValue: word.isActive },
      ],
    }).catch(() => {});
    res.json({ word });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That term already exists for this language." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const word = await ReviewRestrictedWord.findByPk(req.params.id);
    if (!word) return res.status(404).json({ message: "Term not found." });
    const snapshot = word.toJSON();
    await word.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: word.id,
      entityName: snapshot.term,
      action: "delete",
      actor: await metaActorFrom(req),
      snapshot,
    }).catch(() => {});
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Accepts a newline-separated list of terms sharing one category/language — covers "import a larger word list." */
export const bulkImport = async (req, res) => {
  try {
    const { terms, category, language } = req.body;
    if (!Array.isArray(terms) || terms.length === 0) return res.status(400).json({ message: "Provide at least one term." });
    if (category && !CATEGORIES.includes(category)) return res.status(400).json({ message: "Invalid category." });
    if (language && !LANGUAGES.includes(language)) return res.status(400).json({ message: "Invalid language." });

    const cleaned = [...new Set(terms.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    const rows = cleaned.map((term) => ({ term, category: category || "Other", language: language || "en" }));
    const created = await ReviewRestrictedWord.bulkCreate(rows, { ignoreDuplicates: true });

    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: 0,
      entityName: `Bulk import (${cleaned.length} terms)`,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: { count: cleaned.length, category, language },
    }).catch(() => {});

    res.status(201).json({ imported: created.length, requested: cleaned.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
