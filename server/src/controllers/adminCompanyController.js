import { Op, fn, col } from "sequelize";
import Company from "../models/Company.js";
import WorkExperience from "../models/WorkExperience.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "company";

async function usageCounts() {
  const rows = await WorkExperience.findAll({
    attributes: ["company", [fn("COUNT", col("id")), "count"]],
    where: { company: { [Op.ne]: null } },
    group: ["company"],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.company, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const companies = await Company.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCounts();
    res.json({ companies: companies.map((s) => ({ ...s.toJSON(), usageCount: counts[s.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listActive = async (req, res) => {
  try {
    const companies = await Company.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] });
    res.json({ companies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Company name is required." });
    const maxOrder = (await Company.max("sortOrder")) || 0;
    const company = await Company.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: company.id,
      entityName: company.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: company.toJSON(),
    }).catch(() => {});
    res.status(201).json({ company: { ...company.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That company already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found." });
    const before = { name: company.name, isActive: company.isActive, sortOrder: company.sortOrder };
    if (req.body.name !== undefined) company.name = req.body.name.trim();
    if (req.body.isActive !== undefined) company.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) company.sortOrder = req.body.sortOrder;
    await company.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: company.id,
      entityName: company.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: company.name },
        { field: "isActive", oldValue: before.isActive, newValue: company.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: company.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCounts();
    res.json({ company: { ...company.toJSON(), usageCount: counts[company.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That company name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found." });
    const snapshot = company.toJSON();
    await company.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: company.id,
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
