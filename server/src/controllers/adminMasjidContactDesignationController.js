import { Op, fn, col } from "sequelize";
import MasjidContactDesignation from "../models/MasjidContactDesignation.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "masjid-contact-designation";

async function usageCountsByName() {
  const rows = await MasjidContactPerson.findAll({
    attributes: ["designation", [fn("COUNT", col("id")), "count"]],
    where: { designation: { [Op.ne]: null } },
    group: ["designation"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.designation, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const designations = await MasjidContactDesignation.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCountsByName();
    res.json({ designations: designations.map((d) => ({ ...d.toJSON(), usageCount: counts[d.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive, isRequired } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Designation name is required." });
    const maxOrder = (await MasjidContactDesignation.max("sortOrder")) || 0;
    const designation = await MasjidContactDesignation.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(isRequired !== undefined ? { isRequired } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: designation.id,
      entityName: designation.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: designation.toJSON(),
    }).catch(() => {});
    res.status(201).json({ designation: { ...designation.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That designation already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const designation = await MasjidContactDesignation.findByPk(req.params.id);
    if (!designation) return res.status(404).json({ message: "Designation not found." });
    const before = { name: designation.name, isActive: designation.isActive, isRequired: designation.isRequired, sortOrder: designation.sortOrder };
    if (req.body.name !== undefined) designation.name = req.body.name.trim();
    if (req.body.isActive !== undefined) designation.isActive = req.body.isActive;
    if (req.body.isRequired !== undefined) designation.isRequired = req.body.isRequired;
    if (req.body.sortOrder !== undefined) designation.sortOrder = req.body.sortOrder;
    await designation.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: designation.id,
      entityName: designation.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: designation.name },
        { field: "isActive", oldValue: before.isActive, newValue: designation.isActive },
        { field: "isRequired", oldValue: before.isRequired, newValue: designation.isRequired },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: designation.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCountsByName();
    res.json({ designation: { ...designation.toJSON(), usageCount: counts[designation.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That designation name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const designation = await MasjidContactDesignation.findByPk(req.params.id);
    if (!designation) return res.status(404).json({ message: "Designation not found." });
    const snapshot = designation.toJSON();
    await designation.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: designation.id,
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
