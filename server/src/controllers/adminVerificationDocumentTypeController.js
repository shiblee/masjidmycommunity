import { Op, fn, col } from "sequelize";
import VerificationDocumentType from "../models/VerificationDocumentType.js";
import GreenTickDocument from "../models/GreenTickDocument.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "verification-document-type";

async function usageCounts() {
  const rows = await GreenTickDocument.findAll({
    attributes: ["documentTypeId", [fn("COUNT", col("id")), "count"]],
    group: ["documentTypeId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.documentTypeId, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const types = await VerificationDocumentType.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ types: types.map((t) => ({ ...t.toJSON(), usageCount: counts[t.id] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, category, description, isActive, isRequired } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Document type name is required." });
    if (!["representative", "masjid", "property"].includes(category)) {
      return res.status(400).json({ message: "Category must be representative, masjid, or property." });
    }
    const maxOrder = (await VerificationDocumentType.max("sortOrder")) || 0;
    const type = await VerificationDocumentType.create({
      name: name.trim(),
      category,
      description: description?.trim() || null,
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(isRequired !== undefined ? { isRequired } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: type.id,
      entityName: type.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: type.toJSON(),
    }).catch(() => {});
    res.status(201).json({ type: { ...type.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That document type already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const type = await VerificationDocumentType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ message: "Document type not found." });
    const before = { name: type.name, category: type.category, description: type.description, isActive: type.isActive, isRequired: type.isRequired, sortOrder: type.sortOrder };
    if (req.body.name !== undefined) type.name = req.body.name.trim();
    if (req.body.category !== undefined) {
      if (!["representative", "masjid", "property"].includes(req.body.category)) {
        return res.status(400).json({ message: "Category must be representative, masjid, or property." });
      }
      type.category = req.body.category;
    }
    if (req.body.description !== undefined) type.description = req.body.description?.trim() || null;
    if (req.body.isActive !== undefined) type.isActive = req.body.isActive;
    if (req.body.isRequired !== undefined) type.isRequired = req.body.isRequired;
    if (req.body.sortOrder !== undefined) type.sortOrder = req.body.sortOrder;
    await type.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: type.id,
      entityName: type.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: type.name },
        { field: "category", oldValue: before.category, newValue: type.category },
        { field: "description", oldValue: before.description, newValue: type.description },
        { field: "isActive", oldValue: before.isActive, newValue: type.isActive },
        { field: "isRequired", oldValue: before.isRequired, newValue: type.isRequired },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: type.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ type: { ...type.toJSON(), usageCount: counts[type.id] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That document type name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const type = await VerificationDocumentType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ message: "Document type not found." });
    const counts = await usageCounts();
    if (counts[type.id]) {
      return res.status(409).json({ message: "This document type is already used by submitted documents — deactivate it instead of deleting." });
    }
    const snapshot = type.toJSON();
    await type.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: type.id,
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
