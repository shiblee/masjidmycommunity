import { Op, fn, col } from "sequelize";
import MaritalStatus from "../models/MaritalStatus.js";
import User from "../models/User.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "marital-status";

async function usageCounts() {
  const rows = await User.findAll({
    attributes: ["maritalStatus", [fn("COUNT", col("id")), "count"]],
    where: { maritalStatus: { [Op.ne]: null } },
    group: ["maritalStatus"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.maritalStatus, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const statuses = await MaritalStatus.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ statuses: statuses.map((s) => ({ ...s.toJSON(), usageCount: counts[s.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const statuses = await MaritalStatus.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ statuses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Marital status name is required." });
    const maxOrder = (await MaritalStatus.max("sortOrder")) || 0;
    const status = await MaritalStatus.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: status.id,
      entityName: status.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: status.toJSON(),
    }).catch(() => {});
    res.status(201).json({ status: { ...status.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That marital status already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const status = await MaritalStatus.findByPk(req.params.id);
    if (!status) return res.status(404).json({ message: "Marital status not found." });
    const before = { name: status.name, isActive: status.isActive, sortOrder: status.sortOrder };
    if (req.body.name !== undefined) status.name = req.body.name.trim();
    if (req.body.isActive !== undefined) status.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) status.sortOrder = req.body.sortOrder;
    await status.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: status.id,
      entityName: status.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: status.name },
        { field: "isActive", oldValue: before.isActive, newValue: status.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: status.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ status: { ...status.toJSON(), usageCount: counts[status.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That marital status name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const status = await MaritalStatus.findByPk(req.params.id);
    if (!status) return res.status(404).json({ message: "Marital status not found." });
    const snapshot = status.toJSON();
    await status.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: status.id,
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
