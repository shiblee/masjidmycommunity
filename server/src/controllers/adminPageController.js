import Page from "../models/Page.js";
import PageContent from "../models/PageContent.js";

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const list = async (req, res) => {
  try {
    const pages = await Page.findAll({ order: [["sortOrder", "ASC"]] });
    const contents = await PageContent.findAll({ attributes: ["pageId", "languageCode"] });
    const languagesByPage = {};
    for (const c of contents) {
      (languagesByPage[c.pageId] ||= []).push(c.languageCode);
    }
    res.json({
      pages: pages.map((p) => ({ ...p.toJSON(), contentLanguages: languagesByPage[p.id] || [] })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { defaultTitle } = req.body;
    if (!defaultTitle?.trim()) return res.status(400).json({ message: "Page title is required." });
    const slug = req.body.slug?.trim() ? slugify(req.body.slug) : slugify(defaultTitle);
    if (!slug) return res.status(400).json({ message: "Couldn't derive a URL slug from that title." });
    const maxOrder = (await Page.max("sortOrder")) || 0;
    const page = await Page.create({ defaultTitle: defaultTitle.trim(), slug, sortOrder: maxOrder + 1 });
    res.status(201).json({ page: { ...page.toJSON(), contentLanguages: [] } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "A page with that URL slug already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found." });
    if (req.body.defaultTitle !== undefined) page.defaultTitle = req.body.defaultTitle.trim();
    if (req.body.isActive !== undefined) page.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) page.sortOrder = req.body.sortOrder;
    await page.save();
    res.json({ page: page.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found." });
    await PageContent.destroy({ where: { pageId: page.id } });
    await page.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getContent = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found." });
    const rows = await PageContent.findAll({ where: { pageId: page.id } });
    const content = {};
    rows.forEach((r) => {
      content[r.languageCode] = { title: r.title, bodyHtml: r.bodyHtml, updatedAt: r.updatedAt };
    });
    res.json({ page: page.toJSON(), content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertContent = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (!page) return res.status(404).json({ message: "Page not found." });
    const languageCode = req.params.lang?.trim();
    const { title, bodyHtml } = req.body;
    if (!languageCode) return res.status(400).json({ message: "Language code is required." });
    if (!title?.trim()) return res.status(400).json({ message: "Title is required." });

    await PageContent.upsert({ pageId: page.id, languageCode, title: title.trim(), bodyHtml: bodyHtml || "" });
    const row = await PageContent.findOne({ where: { pageId: page.id, languageCode } });
    res.json({ content: { title: row.title, bodyHtml: row.bodyHtml, updatedAt: row.updatedAt } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
