import fs from "fs";
import SuccessStory from "../models/SuccessStory.js";

function toBool(v, fallback) {
  if (v === undefined) return fallback;
  if (typeof v === "boolean") return v;
  return v === "true" || v === "1";
}

function slugify(title) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "success-story"
  );
}

async function generateUniqueSlug(title, excludeId) {
  const base = slugify(title);
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await SuccessStory.findOne({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${++n}`;
  }
}

export const list = async (req, res) => {
  try {
    const stories = await SuccessStory.findAll({ order: [["sortOrder", "ASC"]] });
    res.json({ stories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { title, summary, story, masjidName, location, highlights } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required." });
    if (!summary?.trim()) return res.status(400).json({ message: "Summary is required." });
    if (!story?.trim()) return res.status(400).json({ message: "The detailed story is required." });

    const slug = await generateUniqueSlug(title.trim());
    const maxOrder = (await SuccessStory.max("sortOrder")) || 0;
    const created = await SuccessStory.create({
      title: title.trim(),
      slug,
      summary: summary.trim(),
      story: story.trim(),
      masjidName: masjidName?.trim() || null,
      location: location?.trim() || null,
      highlights: highlights?.trim() || null,
      imageUrl: req.file ? `/uploads/success-story-photos/${req.file.filename}` : null,
      isFeatured: toBool(req.body.isFeatured, false),
      isActive: toBool(req.body.isActive, true),
      sortOrder: maxOrder + 1,
    });
    res.status(201).json({ story: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const row = await SuccessStory.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Success story not found." });

    if (req.body.title !== undefined) {
      if (!req.body.title.trim()) return res.status(400).json({ message: "Title is required." });
      if (req.body.title.trim() !== row.title) row.slug = await generateUniqueSlug(req.body.title.trim(), row.id);
      row.title = req.body.title.trim();
    }
    if (req.body.summary !== undefined) {
      if (!req.body.summary.trim()) return res.status(400).json({ message: "Summary is required." });
      row.summary = req.body.summary.trim();
    }
    if (req.body.story !== undefined) {
      if (!req.body.story.trim()) return res.status(400).json({ message: "The detailed story is required." });
      row.story = req.body.story.trim();
    }
    if (req.body.masjidName !== undefined) row.masjidName = req.body.masjidName.trim() || null;
    if (req.body.location !== undefined) row.location = req.body.location.trim() || null;
    if (req.body.highlights !== undefined) row.highlights = req.body.highlights.trim() || null;
    if (req.body.isFeatured !== undefined) row.isFeatured = toBool(req.body.isFeatured);
    if (req.body.isActive !== undefined) row.isActive = toBool(req.body.isActive);
    if (req.body.sortOrder !== undefined) row.sortOrder = req.body.sortOrder;

    const previousImage = row.imageUrl;
    if (req.file) {
      row.imageUrl = `/uploads/success-story-photos/${req.file.filename}`;
    } else if (req.body.removeImage === "true") {
      row.imageUrl = null;
    }

    await row.save();

    if (row.imageUrl !== previousImage && previousImage) {
      fs.unlink(`.${previousImage}`, () => {});
    }

    res.json({ story: row });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const row = await SuccessStory.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Success story not found." });
    const image = row.imageUrl;
    await row.destroy();
    if (image) fs.unlink(`.${image}`, () => {});
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
