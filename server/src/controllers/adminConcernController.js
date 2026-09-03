import { Op } from "sequelize";
import Concern from "../models/Concern.js";
import ConcernHistory from "../models/ConcernHistory.js";
import { sendConcernResolvedEmail } from "../services/emailService.js";

async function logHistory(concernId, action, note, actorName) {
  await ConcernHistory.create({ concernId, action, actorType: "admin", actorName: actorName || "Admin", note: note || null });
}

export const listAll = async (req, res) => {
  try {
    const { status, concernType, q, dateFrom, dateTo, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (concernType && concernType !== "all") where.concernType = concernType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(`${dateTo}T23:59:59.999`);
    }
    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      where[Op.or] = [{ reference: { [Op.like]: term } }, { fullName: { [Op.like]: term } }, { email: { [Op.like]: term } }, { subject: { [Op.like]: term } }];
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await Concern.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });

    const counts = {};
    for (const s of ["open", "resolved", "closed"]) counts[s] = await Concern.count({ where: { status: s } });

    res.json({ concerns: rows, total: count, page: Number(page) || 1, pageSize: limit, counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lightweight endpoint for the sidebar badge — polled independently of the
// full concern list so refreshing the count doesn't pull every concern row.
export const counts = async (req, res) => {
  try {
    const result = {};
    for (const s of ["open", "resolved", "closed"]) result[s] = await Concern.count({ where: { status: s } });
    result.unresolved = result.open + result.closed;
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const concern = await Concern.findByPk(req.params.id);
    if (!concern) return res.status(404).json({ message: "Concern not found." });
    const history = await ConcernHistory.findAll({ where: { concernId: concern.id }, order: [["createdAt", "DESC"]] });
    res.json({ concern, history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: "Note can't be empty." });
    const concern = await Concern.findByPk(req.params.id);
    if (!concern) return res.status(404).json({ message: "Concern not found." });

    await logHistory(concern.id, "note", note.trim(), req.user.email);
    const history = await ConcernHistory.findAll({ where: { concernId: concern.id }, order: [["createdAt", "DESC"]] });
    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resolve = async (req, res) => {
  try {
    const { remarks } = req.body;
    const concern = await Concern.findByPk(req.params.id);
    if (!concern) return res.status(404).json({ message: "Concern not found." });
    if (concern.status === "resolved") return res.status(400).json({ message: "This concern is already resolved." });

    concern.status = "resolved";
    concern.adminRemarks = remarks?.trim() || concern.adminRemarks || null;
    concern.resolvedBy = req.user.email;
    concern.resolvedAt = new Date();
    await concern.save();
    await logHistory(concern.id, "resolved", concern.adminRemarks, req.user.email);

    sendConcernResolvedEmail(concern).catch(() => {});

    res.json({ concern });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const close = async (req, res) => {
  try {
    const concern = await Concern.findByPk(req.params.id);
    if (!concern) return res.status(404).json({ message: "Concern not found." });
    if (concern.status === "closed") return res.status(400).json({ message: "This concern is already closed." });

    concern.status = "closed";
    await concern.save();
    await logHistory(concern.id, "closed", req.body.note, req.user.email);

    res.json({ concern });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reopen = async (req, res) => {
  try {
    const concern = await Concern.findByPk(req.params.id);
    if (!concern) return res.status(404).json({ message: "Concern not found." });
    if (concern.status === "open") return res.status(400).json({ message: "This concern is already open." });

    concern.status = "open";
    await concern.save();
    await logHistory(concern.id, "reopened", req.body.note, req.user.email);

    res.json({ concern });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
