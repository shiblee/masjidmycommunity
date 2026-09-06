import PrayerMaster from "../models/PrayerMaster.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "prayer";

export const list = async (req, res) => {
  try {
    const prayers = await PrayerMaster.findAll({ order: [["sortOrder", "ASC"]] });
    res.json({ prayers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, category, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Prayer name is required." });
    const maxOrder = (await PrayerMaster.max("sortOrder")) || 0;
    const prayer = await PrayerMaster.create({
      name: name.trim(),
      category: category?.trim() || null,
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: prayer.id,
      entityName: prayer.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: prayer.toJSON(),
    }).catch(() => {});
    res.status(201).json({ prayer });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That prayer already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const prayer = await PrayerMaster.findByPk(req.params.id);
    if (!prayer) return res.status(404).json({ message: "Prayer not found." });
    const before = { name: prayer.name, category: prayer.category, isActive: prayer.isActive, sortOrder: prayer.sortOrder };
    if (req.body.name !== undefined) prayer.name = req.body.name.trim();
    if (req.body.category !== undefined) prayer.category = req.body.category?.trim() || null;
    if (req.body.isActive !== undefined) prayer.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) prayer.sortOrder = req.body.sortOrder;
    await prayer.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: prayer.id,
      entityName: prayer.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: prayer.name },
        { field: "category", oldValue: before.category, newValue: prayer.category },
        { field: "isActive", oldValue: before.isActive, newValue: prayer.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: prayer.sortOrder },
      ],
    }).catch(() => {});
    res.json({ prayer });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That prayer name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const prayer = await PrayerMaster.findByPk(req.params.id);
    if (!prayer) return res.status(404).json({ message: "Prayer not found." });
    const snapshot = prayer.toJSON();
    await prayer.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: prayer.id,
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
