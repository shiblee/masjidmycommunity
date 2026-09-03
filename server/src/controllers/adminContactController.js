import { Op } from "sequelize";
import ContactMessage from "../models/ContactMessage.js";
import ContactMessageHistory from "../models/ContactMessageHistory.js";
import { sendContactReplyEmail, sendContactClosedEmail } from "../services/emailService.js";

async function logHistory(contactMessageId, action, note, actorName) {
  await ContactMessageHistory.create({ contactMessageId, action, actorType: "admin", actorName: actorName || "Admin", note: note || null });
}

export const listAll = async (req, res) => {
  try {
    const { status, topic, q, dateFrom, dateTo, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (topic && topic !== "all") where.topic = topic;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(`${dateTo}T23:59:59.999`);
    }
    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      where[Op.or] = [{ reference: { [Op.like]: term } }, { fullName: { [Op.like]: term } }, { email: { [Op.like]: term } }, { message: { [Op.like]: term } }];
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await ContactMessage.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });

    const counts = {};
    for (const s of ["open", "in_progress", "closed"]) counts[s] = await ContactMessage.count({ where: { status: s } });

    res.json({ contacts: rows, total: count, page: Number(page) || 1, pageSize: limit, counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lightweight endpoint for the sidebar badge.
export const counts = async (req, res) => {
  try {
    const result = {};
    for (const s of ["open", "in_progress", "closed"]) result[s] = await ContactMessage.count({ where: { status: s } });
    result.unresolved = result.open + result.in_progress;
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const contact = await ContactMessage.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: "Inquiry not found." });
    const history = await ContactMessageHistory.findAll({ where: { contactMessageId: contact.id }, order: [["createdAt", "DESC"]] });
    res.json({ contact, history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: "Note can't be empty." });
    const contact = await ContactMessage.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: "Inquiry not found." });

    await logHistory(contact.id, "note", note.trim(), req.user.email);
    const history = await ContactMessageHistory.findAll({ where: { contactMessageId: contact.id }, order: [["createdAt", "DESC"]] });
    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// The only action that emails the submitter — internal notes never do.
export const reply = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Reply message can't be empty." });
    const contact = await ContactMessage.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: "Inquiry not found." });

    await sendContactReplyEmail(contact, message.trim());
    await logHistory(contact.id, "replied", message.trim(), req.user.email);

    if (contact.status === "open") {
      contact.status = "in_progress";
      await contact.save();
    }

    res.json({ contact });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markInProgress = async (req, res) => {
  try {
    const contact = await ContactMessage.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: "Inquiry not found." });
    if (contact.status !== "open") return res.status(400).json({ message: "Only an open inquiry can be marked in progress." });

    contact.status = "in_progress";
    await contact.save();
    await logHistory(contact.id, "in_progress", req.body.note, req.user.email);

    res.json({ contact });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const close = async (req, res) => {
  try {
    const contact = await ContactMessage.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: "Inquiry not found." });
    if (contact.status === "closed") return res.status(400).json({ message: "This inquiry is already closed." });

    const note = req.body.note?.trim() || null;
    contact.status = "closed";
    contact.closedBy = req.user.email;
    contact.closedAt = new Date();
    contact.closingRemarks = note;
    await contact.save();
    await logHistory(contact.id, "closed", note, req.user.email);

    sendContactClosedEmail(contact).catch(() => {});

    res.json({ contact });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reopen = async (req, res) => {
  try {
    const contact = await ContactMessage.findByPk(req.params.id);
    if (!contact) return res.status(404).json({ message: "Inquiry not found." });
    if (contact.status !== "closed") return res.status(400).json({ message: "Only a closed inquiry can be reopened." });

    contact.status = "open";
    contact.closedBy = null;
    contact.closedAt = null;
    contact.closingRemarks = null;
    await contact.save();
    await logHistory(contact.id, "reopened", req.body.note, req.user.email);

    res.json({ contact });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
