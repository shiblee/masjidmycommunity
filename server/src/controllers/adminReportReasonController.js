import { fn, col } from "sequelize";
import ReportReason from "../models/ReportReason.js";
import ContentReport from "../models/ContentReport.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "report-reason";

async function usageCountsByName() {
  const rows = await ContentReport.findAll({
    attributes: ["reason", [fn("COUNT", col("id")), "count"]],
    group: ["reason"],
    raw: true,
  });
  return Object.fromEntries(rows.filter((r) => r.reason).map((r) => [r.reason, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const reasons = await ReportReason.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCountsByName();
    res.json({ reasons: reasons.map((r) => ({ ...r.toJSON(), usageCount: counts[r.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Reason name is required." });
    const maxOrder = (await ReportReason.max("sortOrder")) || 0;
    const reason = await ReportReason.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: reason.id,
      entityName: reason.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: reason.toJSON(),
    }).catch(() => {});
    res.status(201).json({ reason: { ...reason.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That reason already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const reason = await ReportReason.findByPk(req.params.id);
    if (!reason) return res.status(404).json({ message: "Reason not found." });
    const before = { name: reason.name, isActive: reason.isActive, sortOrder: reason.sortOrder };
    if (req.body.name !== undefined) reason.name = req.body.name.trim();
    if (req.body.isActive !== undefined) reason.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) reason.sortOrder = req.body.sortOrder;
    await reason.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: reason.id,
      entityName: reason.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: reason.name },
        { field: "isActive", oldValue: before.isActive, newValue: reason.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: reason.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCountsByName();
    res.json({ reason: { ...reason.toJSON(), usageCount: counts[reason.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That reason name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const reason = await ReportReason.findByPk(req.params.id);
    if (!reason) return res.status(404).json({ message: "Reason not found." });
    const snapshot = reason.toJSON();
    await reason.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: reason.id,
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
