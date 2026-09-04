import { fn, col } from "sequelize";
import CampaignClassification from "../models/CampaignClassification.js";
import Campaign from "../models/Campaign.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "campaign-classification";

async function classificationCountsByName() {
  const rows = await Campaign.findAll({
    attributes: ["donationType", [fn("COUNT", col("id")), "count"]],
    group: ["donationType"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.donationType, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const classifications = await CampaignClassification.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await classificationCountsByName();
    res.json({ classifications: classifications.map((c) => ({ ...c.toJSON(), campaignCount: counts[c.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Classification name is required." });
    const maxOrder = (await CampaignClassification.max("sortOrder")) || 0;
    const classification = await CampaignClassification.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: classification.id,
      entityName: classification.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: classification.toJSON(),
    }).catch(() => {});
    res.status(201).json({ classification: { ...classification.toJSON(), campaignCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That classification already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const classification = await CampaignClassification.findByPk(req.params.id);
    if (!classification) return res.status(404).json({ message: "Classification not found." });
    const before = { name: classification.name, isActive: classification.isActive, sortOrder: classification.sortOrder };
    if (req.body.name !== undefined) classification.name = req.body.name.trim();
    if (req.body.isActive !== undefined) classification.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) classification.sortOrder = req.body.sortOrder;
    await classification.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: classification.id,
      entityName: classification.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: classification.name },
        { field: "isActive", oldValue: before.isActive, newValue: classification.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: classification.sortOrder },
      ],
    }).catch(() => {});
    const counts = await classificationCountsByName();
    res.json({ classification: { ...classification.toJSON(), campaignCount: counts[classification.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That classification name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const classification = await CampaignClassification.findByPk(req.params.id);
    if (!classification) return res.status(404).json({ message: "Classification not found." });
    const snapshot = classification.toJSON();
    await classification.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: classification.id,
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
