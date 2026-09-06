import ReviewRestrictedWord from "../models/ReviewRestrictedWord.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "review-restricted-word";
const CATEGORIES = ["Vulgar/Abusive", "Sexual/Explicit", "Hate/Harassment", "Threatening", "Offensive", "Other"];
const DETECTION_TYPES = ["exact", "phrase", "variation", "obfuscation", "ai"];
const SEVERITIES = ["low", "medium", "high", "critical"];
const LANGUAGE_FIELDS = { en: "textEn", hi: "textHi", ur: "textUr", ar: "textAr" };

function displayName(word) {
  return word.textEn || word.textHi || word.textUr || word.textAr || word.variants?.[0] || `Entry #${word.id}`;
}

function normalizeVariants(variants) {
  if (!Array.isArray(variants)) return [];
  return [...new Set(variants.map((v) => String(v).trim()).filter(Boolean))];
}

function hasAnyContent({ textEn, textHi, textUr, textAr, variants }) {
  return Boolean(textEn?.trim() || textHi?.trim() || textUr?.trim() || textAr?.trim() || variants.length > 0);
}

export const list = async (req, res) => {
  try {
    const words = await ReviewRestrictedWord.findAll({
      order: [
        ["category", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    res.json({ words });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { category, textEn, textHi, textUr, textAr, detectionType, severity, isActive } = req.body;
    if (category && !CATEGORIES.includes(category)) return res.status(400).json({ message: "Invalid category." });
    if (detectionType && !DETECTION_TYPES.includes(detectionType)) return res.status(400).json({ message: "Invalid detection type." });
    if (severity && !SEVERITIES.includes(severity)) return res.status(400).json({ message: "Invalid severity." });

    const variants = normalizeVariants(req.body.variants);
    if (detectionType !== "ai" && !hasAnyContent({ textEn, textHi, textUr, textAr, variants })) {
      return res.status(400).json({ message: "Enter at least one language, or a variant/transliteration." });
    }

    const word = await ReviewRestrictedWord.create({
      category: category || "Other",
      textEn: textEn?.trim() || null,
      textHi: textHi?.trim() || null,
      textUr: textUr?.trim() || null,
      textAr: textAr?.trim() || null,
      variants,
      detectionType: detectionType || "obfuscation",
      severity: severity || "high",
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: word.id,
      entityName: displayName(word),
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: word.toJSON(),
    }).catch(() => {});
    res.status(201).json({ word });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const word = await ReviewRestrictedWord.findByPk(req.params.id);
    if (!word) return res.status(404).json({ message: "Entry not found." });

    const { category, detectionType, severity } = req.body;
    if (category !== undefined && !CATEGORIES.includes(category)) return res.status(400).json({ message: "Invalid category." });
    if (detectionType !== undefined && !DETECTION_TYPES.includes(detectionType)) return res.status(400).json({ message: "Invalid detection type." });
    if (severity !== undefined && !SEVERITIES.includes(severity)) return res.status(400).json({ message: "Invalid severity." });

    const before = {
      category: word.category,
      textEn: word.textEn,
      textHi: word.textHi,
      textUr: word.textUr,
      textAr: word.textAr,
      variants: word.variants,
      detectionType: word.detectionType,
      severity: word.severity,
      isActive: word.isActive,
    };

    if (category !== undefined) word.category = category;
    if (req.body.textEn !== undefined) word.textEn = req.body.textEn?.trim() || null;
    if (req.body.textHi !== undefined) word.textHi = req.body.textHi?.trim() || null;
    if (req.body.textUr !== undefined) word.textUr = req.body.textUr?.trim() || null;
    if (req.body.textAr !== undefined) word.textAr = req.body.textAr?.trim() || null;
    if (req.body.variants !== undefined) word.variants = normalizeVariants(req.body.variants);
    if (detectionType !== undefined) word.detectionType = detectionType;
    if (severity !== undefined) word.severity = severity;
    if (req.body.isActive !== undefined) word.isActive = req.body.isActive;

    const nextIsAi = word.detectionType === "ai";
    if (!nextIsAi && !hasAnyContent({ textEn: word.textEn, textHi: word.textHi, textUr: word.textUr, textAr: word.textAr, variants: word.variants })) {
      return res.status(400).json({ message: "Enter at least one language, or a variant/transliteration." });
    }

    await word.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: word.id,
      entityName: displayName(word),
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "category", oldValue: before.category, newValue: word.category },
        { field: "textEn", oldValue: before.textEn, newValue: word.textEn },
        { field: "textHi", oldValue: before.textHi, newValue: word.textHi },
        { field: "textUr", oldValue: before.textUr, newValue: word.textUr },
        { field: "textAr", oldValue: before.textAr, newValue: word.textAr },
        { field: "variants", oldValue: before.variants, newValue: word.variants },
        { field: "detectionType", oldValue: before.detectionType, newValue: word.detectionType },
        { field: "severity", oldValue: before.severity, newValue: word.severity },
        { field: "isActive", oldValue: before.isActive, newValue: word.isActive },
      ],
    }).catch(() => {});
    res.json({ word });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const word = await ReviewRestrictedWord.findByPk(req.params.id);
    if (!word) return res.status(404).json({ message: "Entry not found." });
    const snapshot = word.toJSON();
    await word.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: word.id,
      entityName: displayName(snapshot),
      action: "delete",
      actor: await metaActorFrom(req),
      snapshot,
    }).catch(() => {});
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Accepts a newline-separated list of terms sharing one category/language/
 * detection type/severity — each term becomes its own single-language
 * entry. Covers "import a larger word list" for one language at a time;
 * multilingual concepts (an entry with several language columns filled at
 * once) are entered individually via the regular form.
 */
export const bulkImport = async (req, res) => {
  try {
    const { terms, category, language, detectionType, severity } = req.body;
    if (!Array.isArray(terms) || terms.length === 0) return res.status(400).json({ message: "Provide at least one term." });
    if (category && !CATEGORIES.includes(category)) return res.status(400).json({ message: "Invalid category." });
    if (detectionType && !DETECTION_TYPES.includes(detectionType)) return res.status(400).json({ message: "Invalid detection type." });
    if (severity && !SEVERITIES.includes(severity)) return res.status(400).json({ message: "Invalid severity." });

    const field = LANGUAGE_FIELDS[language] || "textEn";
    const cleaned = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
    const rows = cleaned.map((term) => ({
      category: category || "Other",
      [field]: term,
      variants: [],
      detectionType: detectionType || "obfuscation",
      severity: severity || "high",
    }));
    const created = await ReviewRestrictedWord.bulkCreate(rows);

    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: 0,
      entityName: `Bulk import (${cleaned.length} terms)`,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: { count: cleaned.length, category, language, detectionType, severity },
    }).catch(() => {});

    res.status(201).json({ imported: created.length, requested: cleaned.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
