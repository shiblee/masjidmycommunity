import { Op } from "sequelize";
import DevDocModule from "../models/DevDocModule.js";
import DevDocSection from "../models/DevDocSection.js";
import DevDocVersion from "../models/DevDocVersion.js";
import { MODULE_SOURCES } from "../config/devDocModuleSources.js";

// Every model "Sync Documentation" is allowed to introspect, keyed by the
// exact name used in devDocModuleSources.js. Re-importing an already-loaded
// ES module returns the same cached class -- this doesn't re-register
// anything, it just gives sync a handle to read real column definitions
// straight off the live model.
import User from "../models/User.js";
import UserSession from "../models/UserSession.js";
import UserActivityLog from "../models/UserActivityLog.js";
import AuthSettings from "../models/AuthSettings.js";
import CommunityActivity from "../models/CommunityActivity.js";
import EmailTemplate from "../models/EmailTemplate.js";
import EmailLog from "../models/EmailLog.js";
import EmailSettings from "../models/EmailSettings.js";
import Education from "../models/Education.js";
import WorkExperience from "../models/WorkExperience.js";
import UserSkill from "../models/UserSkill.js";
import Skill from "../models/Skill.js";
import UserHobby from "../models/UserHobby.js";
import Hobby from "../models/Hobby.js";
import Masjid from "../models/Masjid.js";
import Campaign from "../models/Campaign.js";
import Job from "../models/Job.js";
import MasjidFavorite from "../models/MasjidFavorite.js";
import JobFavorite from "../models/JobFavorite.js";
import Comment from "../models/Comment.js";
import CommunityActivityVote from "../models/CommunityActivityVote.js";
import CommentVote from "../models/CommentVote.js";
import PostImage from "../models/PostImage.js";
import PostImageVote from "../models/PostImageVote.js";
import ContentSettings from "../models/ContentSettings.js";
import ContentReport from "../models/ContentReport.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidPrayerTimeline from "../models/MasjidPrayerTimeline.js";
import MasjidReview from "../models/MasjidReview.js";
import MasjidCorrectionRequest from "../models/MasjidCorrectionRequest.js";
import GreenTickApplication from "../models/GreenTickApplication.js";
import CampaignBudgetItem from "../models/CampaignBudgetItem.js";
import CampaignDocument from "../models/CampaignDocument.js";
import CampaignPhoto from "../models/CampaignPhoto.js";
import CampaignUpdate from "../models/CampaignUpdate.js";
import Donation from "../models/Donation.js";
import JobApplication from "../models/JobApplication.js";
import JobCategory from "../models/JobCategory.js";
import EmploymentType from "../models/EmploymentType.js";
import ExperienceLevel from "../models/ExperienceLevel.js";
import Company from "../models/Company.js";
import PrayerMaster from "../models/PrayerMaster.js";
import MasjidPrayerTimeChangeLog from "../models/MasjidPrayerTimeChangeLog.js";
import SalahLog from "../models/SalahLog.js";
import UserNotification from "../models/UserNotification.js";
import Concern from "../models/Concern.js";
import ConcernHistory from "../models/ConcernHistory.js";
import ConcernType from "../models/ConcernType.js";
import ContactMessage from "../models/ContactMessage.js";
import ContactMessageHistory from "../models/ContactMessageHistory.js";
import ContactTopic from "../models/ContactTopic.js";
import Language from "../models/Language.js";
import Translation from "../models/Translation.js";

const MODELS = {
  User, UserSession, UserActivityLog, AuthSettings, CommunityActivity, EmailTemplate, EmailLog, EmailSettings,
  Education, WorkExperience, UserSkill, Skill, UserHobby, Hobby, Masjid, Campaign, Job, MasjidFavorite, JobFavorite,
  Comment, CommunityActivityVote, CommentVote, PostImage, PostImageVote, ContentSettings, ContentReport,
  MasjidPhoto, MasjidPrayerTimeline, MasjidReview, MasjidCorrectionRequest, GreenTickApplication,
  CampaignBudgetItem, CampaignDocument, CampaignPhoto, CampaignUpdate, Donation,
  JobApplication, JobCategory, EmploymentType, ExperienceLevel, Company,
  PrayerMaster, MasjidPrayerTimeChangeLog, SalahLog, UserNotification,
  Concern, ConcernHistory, ConcernType, ContactMessage, ContactMessageHistory, ContactTopic, Language, Translation,
};

// Every route file "Sync Documentation" is allowed to introspect. Reading
// an already-imported router's own .stack (Express's real registered-route
// list) rather than parsing source text as regex -- this is what Express
// itself will actually match at request time, not an approximation of it.
import userRoutes from "../routes/userRoutes.js";
import publicUserRoutes from "../routes/publicUserRoutes.js";
import publicCommunityRoutes from "../routes/publicCommunityRoutes.js";
import publicMasjidRoutes from "../routes/publicMasjidRoutes.js";
import publicCampaignRoutes from "../routes/publicCampaignRoutes.js";
import publicJobRoutes from "../routes/publicJobRoutes.js";
import masjidRoutes from "../routes/masjidRoutes.js";
import adminPrayerRoutes from "../routes/adminPrayerRoutes.js";
import campaignRoutes from "../routes/campaignRoutes.js";
import adminCampaignRoutes from "../routes/adminCampaignRoutes.js";
import jobRoutes from "../routes/jobRoutes.js";
import adminJobRoutes from "../routes/adminJobRoutes.js";
import publicConcernRoutes from "../routes/publicConcernRoutes.js";
import adminConcernRoutes from "../routes/adminConcernRoutes.js";
import adminConcernTypeRoutes from "../routes/adminConcernTypeRoutes.js";
import contactRoutes from "../routes/contactRoutes.js";
import adminContactRoutes from "../routes/adminContactRoutes.js";
import adminContactTopicRoutes from "../routes/adminContactTopicRoutes.js";
import publicI18nRoutes from "../routes/publicI18nRoutes.js";
import adminLanguageRoutes from "../routes/adminLanguageRoutes.js";
import adminTranslationRoutes from "../routes/adminTranslationRoutes.js";

const ROUTE_FILES = {
  "userRoutes.js": userRoutes,
  "publicUserRoutes.js": publicUserRoutes,
  "publicCommunityRoutes.js": publicCommunityRoutes,
  "publicMasjidRoutes.js": publicMasjidRoutes,
  "publicCampaignRoutes.js": publicCampaignRoutes,
  "publicJobRoutes.js": publicJobRoutes,
  "masjidRoutes.js": masjidRoutes,
  "adminPrayerRoutes.js": adminPrayerRoutes,
  "campaignRoutes.js": campaignRoutes,
  "adminCampaignRoutes.js": adminCampaignRoutes,
  "jobRoutes.js": jobRoutes,
  "adminJobRoutes.js": adminJobRoutes,
  "publicConcernRoutes.js": publicConcernRoutes,
  "adminConcernRoutes.js": adminConcernRoutes,
  "adminConcernTypeRoutes.js": adminConcernTypeRoutes,
  "contactRoutes.js": contactRoutes,
  "adminContactRoutes.js": adminContactRoutes,
  "adminContactTopicRoutes.js": adminContactTopicRoutes,
  "publicI18nRoutes.js": publicI18nRoutes,
  "adminLanguageRoutes.js": adminLanguageRoutes,
  "adminTranslationRoutes.js": adminTranslationRoutes,
};

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

function renderTable(headers, rows) {
  const th = headers.map((h) => `<th style="border:1px solid #ccc;padding:6px 8px;text-align:left;background:#f4f4f4">${h}</th>`).join("");
  const trs = rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #ccc;padding:6px 8px;">${c}</td>`).join("")}</tr>`).join("");
  return `<table style="border-collapse:collapse;width:100%;font-size:13px"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

// Sequelize DataType instances aren't safely String()-able outside a live
// dialect context -- ENUM's own toString() reaches for a dialect-bound
// escape() function that's never set up on a raw rawAttributes read, and
// throws. .key (a plain string like "STRING"/"ENUM"/"INTEGER") is always
// safe; ENUM additionally exposes its allowed values via .values.
function typeLabel(type) {
  if (!type) return "unknown";
  if (type.key === "ENUM" && Array.isArray(type.values)) return `ENUM(${type.values.join(", ")})`;
  return type.key || "unknown";
}

// One row per real column, read straight off the live Sequelize model --
// name, type, nullability, default, and whether it's the primary key.
function introspectModel(name) {
  const Model = MODELS[name];
  if (!Model) return null;
  const attrs = Model.rawAttributes;
  const rows = Object.entries(attrs).map(([field, def]) => [
    `<code>${field}</code>`,
    typeLabel(def.type),
    def.primaryKey ? "PK" : def.allowNull === false ? "NOT NULL" : "nullable",
    def.defaultValue !== undefined ? String(typeof def.defaultValue === "function" ? def.defaultValue() : def.defaultValue) : "&mdash;",
  ]);
  return { table: Model.getTableName(), rows };
}

// One row per real registered route (path + every HTTP method mounted on
// it), read off the Express Router's own .stack -- the same structure
// Express itself uses to match incoming requests.
function introspectRoutes(fileName, only) {
  const router = ROUTE_FILES[fileName];
  if (!router) return [];
  const byPath = new Map();
  for (const layer of router.stack) {
    if (!layer.route) continue;
    const path = layer.route.path;
    if (only && !only.includes(path)) continue;
    const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
    if (!byPath.has(path)) byPath.set(path, new Set());
    methods.forEach((m) => byPath.get(path).add(m));
  }
  return [...byPath.entries()].map(([path, methods]) => [`<code>${[...methods].join(" / ")} ${path}</code>`]);
}

function buildDbTablesHtml(modelNames) {
  const sections = modelNames.map((name) => {
    const info = introspectModel(name);
    if (!info) return `<p><em>${name} (model not found)</em></p>`;
    return `<p><strong>${name}</strong> &mdash; table <code>${info.table}</code></p>` + renderTable(["Column", "Type", "Constraint", "Default"], info.rows);
  });
  return sections.join("");
}

function buildApisHtml(routeFiles) {
  const sections = routeFiles.map(({ file, only }) => {
    const rows = introspectRoutes(file, only);
    if (rows.length === 0) return "";
    return `<p><strong>${file}</strong></p>` + renderTable(["Endpoint"], rows);
  });
  return sections.filter(Boolean).join("");
}

// Regenerates only the Database Tables and APIs sections of every module
// listed in devDocModuleSources.js, straight from the live models/routes.
// Narrative sections (Overview, Business Logic, Flow, Security, ...) are
// never touched here -- no static analysis can write those accurately.
export const syncDocumentation = async (req, res) => {
  try {
    const updated = [];
    const unchanged = [];

    for (const [moduleKey, source] of Object.entries(MODULE_SOURCES)) {
      const module = await DevDocModule.findOne({ where: { key: moduleKey } });
      if (!module) continue;

      const freshDbTables = buildDbTablesHtml(source.models);
      const freshApis = buildApisHtml(source.routeFiles);
      const sections = await DevDocSection.findAll({ where: { moduleId: module.id } });
      const dbTablesSection = sections.find((s) => s.key === "dbTables");
      const apisSection = sections.find((s) => s.key === "apis");

      let touched = false;
      if (dbTablesSection && dbTablesSection.bodyHtml !== freshDbTables) {
        await dbTablesSection.update({ bodyHtml: freshDbTables });
        touched = true;
      }
      if (apisSection && apisSection.bodyHtml !== freshApis) {
        await apisSection.update({ bodyHtml: freshApis });
        touched = true;
      }

      if (touched) {
        const freshSections = await DevDocSection.findAll({ where: { moduleId: module.id }, order: [["sortOrder", "ASC"]] });
        const lastVersion = await DevDocVersion.max("versionNumber", { where: { moduleId: module.id } });
        await DevDocVersion.create({
          moduleId: module.id,
          versionNumber: (Number.isFinite(lastVersion) ? lastVersion : 0) + 1,
          updatedByName: "Sync",
          changeSummary: "Structural sync: Database Tables / APIs refreshed from source.",
          snapshotJson: freshSections.map((s) => ({ key: s.key, title: s.title, bodyHtml: s.bodyHtml })),
        });
        updated.push(module.title);
      } else {
        unchanged.push(module.title);
      }
    }

    res.json({ updated, unchanged });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
