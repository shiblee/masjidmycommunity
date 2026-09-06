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

// Fields accepted for both create and update — kept in one place so the two
// handlers can't quietly drift apart on which validation-config keys they
// accept.
const VALIDATION_FIELDS = [
  "period", "minTime", "maxTime", "relatedPrayerId", "relation",
  "requiresPreviousCheck", "requiresNextCheck", "aiAnomalyCheck",
];

export const create = async (req, res) => {
  try {
    const { name, category, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Prayer name is required." });
    if (req.body.relatedPrayerId) {
      const related = await PrayerMaster.findByPk(req.body.relatedPrayerId);
      if (!related) return res.status(400).json({ message: "Related prayer not found." });
    }
    const maxOrder = (await PrayerMaster.max("sortOrder")) || 0;
    const validationValues = {};
    for (const field of VALIDATION_FIELDS) {
      if (req.body[field] === undefined) continue;
      validationValues[field] = req.body[field] === "" ? null : req.body[field];
    }
    const prayer = await PrayerMaster.create({
      name: name.trim(),
      category: category?.trim() || null,
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
      ...validationValues,
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
    if (req.body.relatedPrayerId) {
      if (Number(req.body.relatedPrayerId) === prayer.id) {
        return res.status(400).json({ message: "A prayer can't be related to itself." });
      }
      const related = await PrayerMaster.findByPk(req.body.relatedPrayerId);
      if (!related) return res.status(400).json({ message: "Related prayer not found." });
    }
    const before = {
      name: prayer.name, category: prayer.category, isActive: prayer.isActive, sortOrder: prayer.sortOrder,
      period: prayer.period, minTime: prayer.minTime, maxTime: prayer.maxTime,
      relatedPrayerId: prayer.relatedPrayerId, relation: prayer.relation,
      requiresPreviousCheck: prayer.requiresPreviousCheck, requiresNextCheck: prayer.requiresNextCheck,
      aiAnomalyCheck: prayer.aiAnomalyCheck,
    };
    if (req.body.name !== undefined) prayer.name = req.body.name.trim();
    if (req.body.category !== undefined) prayer.category = req.body.category?.trim() || null;
    if (req.body.isActive !== undefined) prayer.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) prayer.sortOrder = req.body.sortOrder;
    for (const field of VALIDATION_FIELDS) {
      if (req.body[field] === undefined) continue;
      prayer[field] = req.body[field] === "" ? null : req.body[field];
    }
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
        { field: "period", oldValue: before.period, newValue: prayer.period },
        { field: "minTime", oldValue: before.minTime, newValue: prayer.minTime },
        { field: "maxTime", oldValue: before.maxTime, newValue: prayer.maxTime },
        { field: "relatedPrayerId", oldValue: before.relatedPrayerId, newValue: prayer.relatedPrayerId },
        { field: "relation", oldValue: before.relation, newValue: prayer.relation },
        { field: "requiresPreviousCheck", oldValue: before.requiresPreviousCheck, newValue: prayer.requiresPreviousCheck },
        { field: "requiresNextCheck", oldValue: before.requiresNextCheck, newValue: prayer.requiresNextCheck },
        { field: "aiAnomalyCheck", oldValue: before.aiAnomalyCheck, newValue: prayer.aiAnomalyCheck },
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
