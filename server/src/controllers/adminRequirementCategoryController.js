import { fn, col } from "sequelize";
import RequirementCategory from "../models/RequirementCategory.js";
import RequirementSubcategory from "../models/RequirementSubcategory.js";
import Requirement from "../models/Requirement.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const CATEGORY_ENTITY = "requirement-category";
const SUBCATEGORY_ENTITY = "requirement-subcategory";

async function categoryUsageCounts() {
  const rows = await Requirement.findAll({
    attributes: ["categoryId", [fn("COUNT", col("id")), "count"]],
    group: ["categoryId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.categoryId, Number(r.count)]));
}

async function subcategoryUsageCounts() {
  const rows = await Requirement.findAll({
    attributes: ["subcategoryId", [fn("COUNT", col("id")), "count"]],
    group: ["subcategoryId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.subcategoryId, Number(r.count)]));
}

async function subcategoryCounts() {
  const rows = await RequirementSubcategory.findAll({
    attributes: ["categoryId", [fn("COUNT", col("id")), "count"]],
    group: ["categoryId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.categoryId, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const categories = await RequirementCategory.findAll({ order: [["sortOrder", "ASC"]] });
    const [usage, subCounts] = await Promise.all([categoryUsageCounts(), subcategoryCounts()]);
    res.json({
      requirementCategories: categories.map((c) => ({
        ...c.toJSON(),
        usageCount: usage[c.id] || 0,
        subcategoryCount: subCounts[c.id] || 0,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const requirementCategories = await RequirementCategory.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ requirementCategories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, icon, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Requirement category name is required." });
    const maxOrder = (await RequirementCategory.max("sortOrder")) || 0;
    const category = await RequirementCategory.create({
      name: name.trim(),
      icon: icon?.trim() || null,
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: CATEGORY_ENTITY,
      entityId: category.id,
      entityName: category.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: category.toJSON(),
    }).catch(() => {});
    res.status(201).json({ requirementCategory: { ...category.toJSON(), usageCount: 0, subcategoryCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That requirement category already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const category = await RequirementCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: "Requirement category not found." });
    const before = { name: category.name, icon: category.icon, isActive: category.isActive, sortOrder: category.sortOrder };
    if (req.body.name !== undefined) category.name = req.body.name.trim();
    if (req.body.icon !== undefined) category.icon = req.body.icon?.trim() || null;
    if (req.body.isActive !== undefined) category.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) category.sortOrder = req.body.sortOrder;
    await category.save();
    recordMetaChange({
      entityType: CATEGORY_ENTITY,
      entityId: category.id,
      entityName: category.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: category.name },
        { field: "icon", oldValue: before.icon, newValue: category.icon },
        { field: "isActive", oldValue: before.isActive, newValue: category.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: category.sortOrder },
      ],
    }).catch(() => {});
    const [usage, subCounts] = await Promise.all([categoryUsageCounts(), subcategoryCounts()]);
    res.json({ requirementCategory: { ...category.toJSON(), usageCount: usage[category.id] || 0, subcategoryCount: subCounts[category.id] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That requirement category name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const category = await RequirementCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: "Requirement category not found." });
    const subCount = await RequirementSubcategory.count({ where: { categoryId: category.id } });
    if (subCount > 0) return res.status(409).json({ message: "Delete this category's subcategories first." });
    const snapshot = category.toJSON();
    await category.destroy();
    recordMetaChange({
      entityType: CATEGORY_ENTITY,
      entityId: category.id,
      entityName: snapshot.name,
      action: "delete",
      actor: await metaActorFrom(req),
      snapshot,
    }).catch(() => {});
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Subcategories -- always scoped to one categoryId, never listed globally ---

export const listSubcategories = async (req, res) => {
  try {
    const subcategories = await RequirementSubcategory.findAll({ where: { categoryId: req.params.categoryId }, order: [["sortOrder", "ASC"]] });
    const usage = await subcategoryUsageCounts();
    res.json({ requirementSubcategories: subcategories.map((s) => ({ ...s.toJSON(), usageCount: usage[s.id] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActiveSubcategories = async (req, res) => {
  try {
    const categoryId = req.query.categoryId;
    if (!categoryId) return res.status(400).json({ message: "categoryId is required." });
    const requirementSubcategories = await RequirementSubcategory.findAll({ where: { categoryId, isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ requirementSubcategories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSubcategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const categoryId = req.params.categoryId;
    if (!name?.trim()) return res.status(400).json({ message: "Subcategory name is required." });
    const category = await RequirementCategory.findByPk(categoryId);
    if (!category) return res.status(404).json({ message: "Requirement category not found." });
    const maxOrder = (await RequirementSubcategory.max("sortOrder", { where: { categoryId } })) || 0;
    const subcategory = await RequirementSubcategory.create({
      categoryId,
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: SUBCATEGORY_ENTITY,
      entityId: subcategory.id,
      entityName: `${category.name} → ${subcategory.name}`,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: subcategory.toJSON(),
    }).catch(() => {});
    res.status(201).json({ requirementSubcategory: { ...subcategory.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That subcategory already exists under this category." });
    res.status(500).json({ message: error.message });
  }
};

export const updateSubcategory = async (req, res) => {
  try {
    const subcategory = await RequirementSubcategory.findByPk(req.params.id);
    if (!subcategory) return res.status(404).json({ message: "Subcategory not found." });
    const before = { name: subcategory.name, isActive: subcategory.isActive, sortOrder: subcategory.sortOrder };
    if (req.body.name !== undefined) subcategory.name = req.body.name.trim();
    if (req.body.isActive !== undefined) subcategory.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) subcategory.sortOrder = req.body.sortOrder;
    await subcategory.save();
    recordMetaChange({
      entityType: SUBCATEGORY_ENTITY,
      entityId: subcategory.id,
      entityName: subcategory.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: subcategory.name },
        { field: "isActive", oldValue: before.isActive, newValue: subcategory.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: subcategory.sortOrder },
      ],
    }).catch(() => {});
    const usage = await subcategoryUsageCounts();
    res.json({ requirementSubcategory: { ...subcategory.toJSON(), usageCount: usage[subcategory.id] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That subcategory name is already in use under this category." });
    res.status(500).json({ message: error.message });
  }
};

export const removeSubcategory = async (req, res) => {
  try {
    const subcategory = await RequirementSubcategory.findByPk(req.params.id);
    if (!subcategory) return res.status(404).json({ message: "Subcategory not found." });
    const snapshot = subcategory.toJSON();
    await subcategory.destroy();
    recordMetaChange({
      entityType: SUBCATEGORY_ENTITY,
      entityId: subcategory.id,
      entityName: snapshot.name,
      action: "delete",
      actor: await metaActorFrom(req),
      snapshot,
    }).catch(() => {});
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
