import { Op, fn, col } from "sequelize";
import Bank from "../models/Bank.js";
import MasjidDonationAccount from "../models/MasjidDonationAccount.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const ENTITY_TYPE = "bank";

async function usageCountsByName() {
  const rows = await MasjidDonationAccount.findAll({
    attributes: ["bankName", [fn("COUNT", col("id")), "count"]],
    where: { bankName: { [Op.ne]: null } },
    group: ["bankName"],
    raw: true,
  });
  return Object.fromEntries(rows.filter((r) => r.bankName).map((r) => [r.bankName, Number(r.count)]));
}

export const list = async (req, res) => {
  try {
    const banks = await Bank.findAll({ order: [["sortOrder", "ASC"]] });
    const counts = await usageCountsByName();
    res.json({ banks: banks.map((b) => ({ ...b.toJSON(), usageCount: counts[b.name] || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Bank name is required." });
    const maxOrder = (await Bank.max("sortOrder")) || 0;
    const bank = await Bank.create({
      name: name.trim(),
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: bank.id,
      entityName: bank.name,
      action: "create",
      actor: await metaActorFrom(req),
      snapshot: bank.toJSON(),
    }).catch(() => {});
    res.status(201).json({ bank: { ...bank.toJSON(), usageCount: 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That bank already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const bank = await Bank.findByPk(req.params.id);
    if (!bank) return res.status(404).json({ message: "Bank not found." });
    const before = { name: bank.name, isActive: bank.isActive, sortOrder: bank.sortOrder };
    if (req.body.name !== undefined) bank.name = req.body.name.trim();
    if (req.body.isActive !== undefined) bank.isActive = req.body.isActive;
    if (req.body.sortOrder !== undefined) bank.sortOrder = req.body.sortOrder;
    await bank.save();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: bank.id,
      entityName: bank.name,
      action: "update",
      actor: await metaActorFrom(req),
      fields: [
        { field: "name", oldValue: before.name, newValue: bank.name },
        { field: "isActive", oldValue: before.isActive, newValue: bank.isActive },
        { field: "sortOrder", oldValue: before.sortOrder, newValue: bank.sortOrder },
      ],
    }).catch(() => {});
    const counts = await usageCountsByName();
    res.json({ bank: { ...bank.toJSON(), usageCount: counts[bank.name] || 0 } });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That bank name is already in use." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const bank = await Bank.findByPk(req.params.id);
    if (!bank) return res.status(404).json({ message: "Bank not found." });
    const snapshot = bank.toJSON();
    await bank.destroy();
    recordMetaChange({
      entityType: ENTITY_TYPE,
      entityId: bank.id,
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
