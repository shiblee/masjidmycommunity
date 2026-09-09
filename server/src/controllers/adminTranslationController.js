import { fn, col } from "sequelize";
import Translation from "../models/Translation.js";
import Language from "../models/Language.js";

export const list = async (req, res) => {
  try {
    const where = req.query.category ? { category: req.query.category } : {};
    const rows = await Translation.findAll({ where, order: [["category", "ASC"], ["key", "ASC"]] });
    const byKey = {};
    for (const r of rows) {
      if (!byKey[r.key]) byKey[r.key] = { key: r.key, category: r.category, values: {} };
      byKey[r.key].values[r.languageCode] = r.value;
    }
    res.json({ translations: Object.values(byKey) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listCategories = async (req, res) => {
  try {
    const rows = await Translation.findAll({ attributes: [[fn("DISTINCT", col("category")), "category"]], raw: true });
    res.json({ categories: rows.map((r) => r.category).sort() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upserts one key's value across however many languages are provided in a
// single request — an admin editing a row in the translation grid saves all
// language columns for that row at once, rather than one request per cell.
export const upsert = async (req, res) => {
  try {
    const key = req.params.key?.trim();
    const category = req.body.category?.trim();
    const { values } = req.body;
    if (!key) return res.status(400).json({ message: "Translation key is required." });
    if (!category) return res.status(400).json({ message: "Category is required." });
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      return res.status(400).json({ message: "Values must be an object of languageCode → text." });
    }

    const entries = Object.entries(values).filter(([, v]) => v !== undefined && v !== null);
    await Promise.all(
      entries.map(([languageCode, value]) => Translation.upsert({ key, category, languageCode, value: String(value) }))
    );

    const rows = await Translation.findAll({ where: { key } });
    const result = { key, category, values: {} };
    rows.forEach((r) => { result.values[r.languageCode] = r.value; });
    res.json({ translation: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// The full key set is the union of every key that exists for ANY language
// (not just "en") — a key an admin added only in Hindi still counts toward
// the total, so a language that's ahead of English isn't penalized.
export const getCoverage = async (req, res) => {
  try {
    const [languages, rows] = await Promise.all([
      Language.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] }),
      Translation.findAll({ attributes: ["key", "languageCode", "value"], raw: true }),
    ]);

    const allKeys = new Set();
    const translatedKeysByLang = {};
    for (const r of rows) {
      allKeys.add(r.key);
      if (r.value && r.value.trim()) {
        (translatedKeysByLang[r.languageCode] = translatedKeysByLang[r.languageCode] || new Set()).add(r.key);
      }
    }
    const total = allKeys.size;

    const coverage = languages.map((l) => {
      const translated = translatedKeysByLang[l.code]?.size || 0;
      const missing = [...allKeys].filter((k) => !translatedKeysByLang[l.code]?.has(k)).sort();
      return {
        code: l.code,
        name: l.name,
        total,
        translated,
        percent: total ? Math.round((translated / total) * 100) : 100,
        missingKeys: missing.slice(0, 200),
        missingCount: missing.length,
      };
    });

    res.json({ coverage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    await Translation.destroy({ where: { key: req.params.key } });
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
