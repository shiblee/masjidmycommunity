import { Op } from "sequelize";
import SuccessStory from "../models/SuccessStory.js";
import Translation from "../models/Translation.js";

const FIELDS = ["summary", "story", "highlights"];

async function overridesFor(rows, lang) {
  if (lang === "en" || rows.length === 0) return {};
  const translations = await Translation.findAll({
    where: {
      category: "successStory",
      languageCode: lang,
      key: { [Op.in]: rows.flatMap((r) => FIELDS.map((f) => `successStory.${f}.${r.id}`)) },
    },
  });
  return Object.fromEntries(translations.map((t) => [t.key, t.value]));
}

function serialize(row, overrides) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: overrides[`successStory.summary.${row.id}`] || row.summary,
    story: overrides[`successStory.story.${row.id}`] || row.story,
    imageUrl: row.imageUrl,
    masjidName: row.masjidName,
    location: row.location,
    highlights: overrides[`successStory.highlights.${row.id}`] || row.highlights,
    isFeatured: row.isFeatured,
  };
}

export const list = async (req, res) => {
  try {
    const { lang = "en", featured } = req.query;
    const where = { isActive: true };
    if (featured === "true") where.isFeatured = true;

    const stories = await SuccessStory.findAll({ where, order: [["sortOrder", "ASC"]] });
    const overrides = await overridesFor(stories, lang);

    res.json({ stories: stories.map((s) => serialize(s, overrides)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const { lang = "en" } = req.query;
    const row = await SuccessStory.findOne({ where: { slug: req.params.slug, isActive: true } });
    if (!row) return res.status(404).json({ message: "Success story not found." });

    const overrides = await overridesFor([row], lang);
    res.json({ story: serialize(row, overrides) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
