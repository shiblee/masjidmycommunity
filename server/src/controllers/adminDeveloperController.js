import { Op } from "sequelize";
import DevDocModule from "../models/DevDocModule.js";
import DevDocSection from "../models/DevDocSection.js";
import DevDocVersion from "../models/DevDocVersion.js";

// The fixed section set every new module is seeded with, matching the
// Developer module spec's own structure exactly. Admins can still add/
// remove sections per module afterward (DevDocSection.key/title are free
// text beyond these defaults).
export const DEFAULT_SECTION_KEYS = [
  { key: "overview", title: "Overview" },
  { key: "userFlow", title: "User / Process Flow" },
  { key: "dbTables", title: "Database Tables" },
  { key: "relationships", title: "Table Relationships" },
  { key: "apis", title: "APIs" },
  { key: "businessLogic", title: "Business Logic" },
  { key: "validation", title: "Validation" },
  { key: "errorHandling", title: "Error Handling" },
  { key: "dependencies", title: "Dependencies" },
];

function slugify(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const listModules = async (req, res) => {
  try {
    const modules = await DevDocModule.findAll({ order: [["category", "ASC"], ["sortOrder", "ASC"], ["title", "ASC"]] });
    res.json({ modules });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getModule = async (req, res) => {
  try {
    const module = await DevDocModule.findByPk(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found." });
    const sections = await DevDocSection.findAll({ where: { moduleId: module.id }, order: [["sortOrder", "ASC"]] });
    res.json({ module, sections });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createModule = async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Module title is required." });

    const key = slugify(title);
    const existing = await DevDocModule.findOne({ where: { key } });
    if (existing) return res.status(400).json({ message: "A module with this title already exists." });

    const maxSort = await DevDocModule.max("sortOrder", { where: category ? { category } : {} });
    const module = await DevDocModule.create({
      key,
      title: title.trim(),
      category: category?.trim() || null,
      sortOrder: (Number.isFinite(maxSort) ? maxSort : -1) + 1,
    });
    await DevDocSection.bulkCreate(
      DEFAULT_SECTION_KEYS.map((s, i) => ({ moduleId: module.id, key: s.key, title: s.title, bodyHtml: "", sortOrder: i }))
    );
    res.status(201).json({ module });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const module = await DevDocModule.findByPk(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found." });

    const { title, category, status, sortOrder } = req.body;
    if (title !== undefined) module.title = title;
    if (category !== undefined) module.category = category;
    if (status !== undefined) module.status = status;
    if (sortOrder !== undefined) module.sortOrder = sortOrder;
    await module.save();
    res.json({ module });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const module = await DevDocModule.findByPk(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found." });
    await DevDocSection.destroy({ where: { moduleId: module.id } });
    await DevDocVersion.destroy({ where: { moduleId: module.id } });
    await module.destroy();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk-replaces a module's sections (title/bodyHtml/sortOrder, and any
// newly-added ones) in one call, then writes a single DevDocVersion
// snapshot for the whole save -- one changelog entry per "Save
// Documentation" click, not one per section or per keystroke.
export const saveSections = async (req, res) => {
  try {
    const module = await DevDocModule.findByPk(req.params.id);
    if (!module) return res.status(404).json({ message: "Module not found." });

    const { sections, changeSummary } = req.body;
    if (!Array.isArray(sections)) return res.status(400).json({ message: "sections must be an array." });

    const existing = await DevDocSection.findAll({ where: { moduleId: module.id } });
    const existingIds = new Set(existing.map((s) => s.id));
    const keepIds = new Set();

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (s.id && existingIds.has(s.id)) {
        await DevDocSection.update({ title: s.title, bodyHtml: s.bodyHtml || "", sortOrder: i }, { where: { id: s.id } });
        keepIds.add(s.id);
      } else {
        const created = await DevDocSection.create({
          moduleId: module.id,
          key: s.key || slugify(s.title || `section-${i}`),
          title: s.title || "Untitled Section",
          bodyHtml: s.bodyHtml || "",
          sortOrder: i,
        });
        keepIds.add(created.id);
      }
    }
    // Any section the client no longer sent was deliberately removed
    // (the admin used the per-section delete button) -- drop it here.
    const toRemove = existing.filter((s) => !keepIds.has(s.id)).map((s) => s.id);
    if (toRemove.length) await DevDocSection.destroy({ where: { id: toRemove } });

    const freshSections = await DevDocSection.findAll({ where: { moduleId: module.id }, order: [["sortOrder", "ASC"]] });

    const lastVersion = await DevDocVersion.max("versionNumber", { where: { moduleId: module.id } });
    await DevDocVersion.create({
      moduleId: module.id,
      versionNumber: (Number.isFinite(lastVersion) ? lastVersion : 0) + 1,
      updatedByName: req.user.name || req.user.email,
      changeSummary: changeSummary?.trim() || null,
      snapshotJson: freshSections.map((s) => ({ key: s.key, title: s.title, bodyHtml: s.bodyHtml })),
    });

    res.json({ sections: freshSections });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listVersions = async (req, res) => {
  try {
    const versions = await DevDocVersion.findAll({
      where: { moduleId: req.params.id },
      order: [["versionNumber", "DESC"]],
      attributes: ["id", "versionNumber", "updatedByName", "changeSummary", "createdAt"],
    });
    res.json({ versions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Strips HTML tags for a clean-ish plain-text snippet around the first
// match -- good enough for a documentation search result preview without
// pulling in a real full-text search dependency this codebase doesn't have.
function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function snippetAround(text, term, radius = 80) {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + term.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export const search = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ results: [] });

    const [moduleHits, sectionHits] = await Promise.all([
      DevDocModule.findAll({ where: { title: { [Op.like]: `%${q}%` } } }),
      DevDocSection.findAll({ where: { bodyHtml: { [Op.like]: `%${q}%` } } }),
    ]);

    const moduleIds = [...new Set([...moduleHits.map((m) => m.id), ...sectionHits.map((s) => s.moduleId)])];
    const modules = moduleIds.length ? await DevDocModule.findAll({ where: { id: moduleIds } }) : [];
    const moduleById = new Map(modules.map((m) => [m.id, m]));

    const results = [
      ...moduleHits.map((m) => ({ moduleId: m.id, moduleTitle: m.title, sectionTitle: null, snippet: null })),
      ...sectionHits.map((s) => ({
        moduleId: s.moduleId,
        moduleTitle: moduleById.get(s.moduleId)?.title || "",
        sectionTitle: s.title,
        snippet: snippetAround(stripHtml(s.bodyHtml), q),
      })),
    ];

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
