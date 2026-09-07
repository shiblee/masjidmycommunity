import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import GreenTickApplication from "../models/GreenTickApplication.js";
import GreenTickRepresentative from "../models/GreenTickRepresentative.js";
import GreenTickDocument from "../models/GreenTickDocument.js";
import GreenTickStatusLog from "../models/GreenTickStatusLog.js";
import VerificationDocumentType from "../models/VerificationDocumentType.js";
import {
  getOrCreateApplication,
  greenTickActorFrom,
  logStatusChange,
  computeProgress,
  meetsIssuanceRequirements,
  notifyApplicationStatus,
  STATUS_LABEL,
} from "../services/greenTickService.js";

function withoutStoredPath(doc) {
  const json = doc.toJSON();
  delete json.storedPath;
  return json;
}

/** Admin has full authority — every masjid's applications, any status, no ownership filter. */
export const listApplications = async (req, res) => {
  try {
    const { status, q, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;

    const limit = Math.min(Number(pageSize) || 20, 100);
    const pageNum = Math.max(Number(page) || 1, 1);

    let masjidIdFilter;
    if (q?.trim()) {
      const matches = await Masjid.findAll({ where: { name: { [Op.like]: `%${q.trim()}%` } }, attributes: ["id"] });
      masjidIdFilter = matches.map((m) => m.id);
      where.masjidId = { [Op.in]: masjidIdFilter.length ? masjidIdFilter : [-1] };
    }

    const { rows, count } = await GreenTickApplication.findAndCountAll({
      where,
      order: [["updatedAt", "DESC"]],
      limit,
      offset: (pageNum - 1) * limit,
    });

    const masjids = await Masjid.findAll({ where: { id: rows.map((a) => a.masjidId) }, attributes: ["id", "name", "category", "city", "country"] });
    const masjidById = new Map(masjids.map((m) => [m.id, m]));

    res.json({
      applications: rows.map((a) => ({ ...a.toJSON(), statusLabel: STATUS_LABEL[a.status], masjid: masjidById.get(a.masjidId) || null })),
      total: count,
      page: pageNum,
      pageSize: limit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Masjid-scoped view — full admin dashboard for one application, no ownership filter. */
export const getApplication = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const application = await getOrCreateApplication(masjid.id);
    const [representatives, documents, documentTypes, timeline, progress] = await Promise.all([
      GreenTickRepresentative.findAll({ where: { applicationId: application.id } }),
      GreenTickDocument.findAll({ where: { applicationId: application.id } }),
      VerificationDocumentType.findAll({ order: [["sortOrder", "ASC"]] }),
      GreenTickStatusLog.findAll({ where: { applicationId: application.id }, order: [["createdAt", "DESC"]] }),
      computeProgress(application.id),
    ]);

    const contacts = await MasjidContactPerson.findAll({ where: { id: representatives.map((r) => r.contactPersonId) } });
    const contactById = new Map(contacts.map((c) => [c.id, c]));

    res.json({
      masjid: {
        id: masjid.id, name: masjid.name, category: masjid.category,
        address: [masjid.address, masjid.city, masjid.state, masjid.country].filter(Boolean).join(", "),
        status: masjid.status,
      },
      application: { ...application.toJSON(), statusLabel: STATUS_LABEL[application.status] },
      progress,
      representatives: representatives.map((r) => {
        const c = contactById.get(r.contactPersonId);
        return { ...r.toJSON(), contact: c ? { id: c.id, name: c.name, designation: c.designation, mobile: c.mobile } : null };
      }),
      documents: documents.map(withoutStoredPath),
      documentTypes,
      timeline,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function requireApplication(req, res) {
  const masjid = await Masjid.findByPk(req.params.id);
  if (!masjid) {
    res.status(404).json({ message: "Masjid not found." });
    return null;
  }
  const application = await GreenTickApplication.findOne({ where: { masjidId: masjid.id } });
  if (!application) {
    res.status(404).json({ message: "No Green Tick application for this masjid yet." });
    return null;
  }
  return { masjid, application };
}

export const setRepresentativeIdentity = async (req, res) => {
  try {
    const ctx = await requireApplication(req, res);
    if (!ctx) return;
    const { decision, remarks } = req.body;
    if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ message: "Decision must be approved or rejected." });

    const representative = await GreenTickRepresentative.findOne({ where: { id: req.params.repId, applicationId: ctx.application.id } });
    if (!representative) return res.status(404).json({ message: "Representative not found." });

    representative.identityVerificationStatus = decision;
    representative.reviewerRemarks = remarks?.trim() || representative.reviewerRemarks;
    representative.verifiedAt = new Date();
    const actor = await greenTickActorFrom(req);
    representative.verifiedBy = actor.name;
    await representative.save();

    await logStatusChange({
      applicationId: ctx.application.id, masjidId: ctx.masjid.id, representativeId: representative.id,
      action: `representative_identity_${decision}`, actor, remarks,
    });

    res.json({ representative });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setRepresentativeAuthorization = async (req, res) => {
  try {
    const ctx = await requireApplication(req, res);
    if (!ctx) return;
    const { decision, remarks } = req.body;
    if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ message: "Decision must be approved or rejected." });

    const representative = await GreenTickRepresentative.findOne({ where: { id: req.params.repId, applicationId: ctx.application.id } });
    if (!representative) return res.status(404).json({ message: "Representative not found." });

    representative.authorizationStatus = decision;
    representative.reviewerRemarks = remarks?.trim() || representative.reviewerRemarks;
    const actor = await greenTickActorFrom(req);
    await representative.save();

    await logStatusChange({
      applicationId: ctx.application.id, masjidId: ctx.masjid.id, representativeId: representative.id,
      action: `representative_authorization_${decision}`, actor, remarks,
    });

    res.json({ representative });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setDocumentStatus = async (req, res) => {
  try {
    const ctx = await requireApplication(req, res);
    if (!ctx) return;
    const { decision, remarks } = req.body;
    if (!["under_review", "approved", "rejected", "replacement_requested"].includes(decision)) {
      return res.status(400).json({ message: "Decision must be under_review, approved, rejected, or replacement_requested." });
    }

    const doc = await GreenTickDocument.findOne({ where: { id: req.params.docId, applicationId: ctx.application.id } });
    if (!doc) return res.status(404).json({ message: "Document not found." });

    doc.status = decision;
    doc.reviewerRemarks = remarks?.trim() || doc.reviewerRemarks;
    await doc.save();

    const actor = await greenTickActorFrom(req);
    await logStatusChange({
      applicationId: ctx.application.id, masjidId: ctx.masjid.id, documentId: doc.id,
      action: `document_${decision}`, actor, remarks,
    });

    res.json({ document: withoutStoredPath(doc) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Admin's own document download — full authority, no ownership check, but still never a public URL. */
export const downloadDocument = async (req, res) => {
  try {
    const ctx = await requireApplication(req, res);
    if (!ctx) return;
    const doc = await GreenTickDocument.findOne({ where: { id: req.params.docId, applicationId: ctx.application.id } });
    if (!doc || !fs.existsSync(doc.storedPath)) return res.status(404).json({ message: "Document not found." });
    res.download(path.resolve(doc.storedPath), doc.fileName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function transition(req, res, { allowedFrom, newStatus, action, notify }) {
  const ctx = await requireApplication(req, res);
  if (!ctx) return;
  const { application, masjid } = ctx;
  if (allowedFrom && !allowedFrom.includes(application.status)) {
    return res.status(400).json({ message: `This application must be ${allowedFrom.join(" or ")} for this action.` });
  }

  const previousStatus = application.status;
  application.status = newStatus;
  const remarks = req.body.remarks?.trim() || null;
  const now = new Date();
  if (newStatus === "under_review") application.reviewedAt = now;
  if (newStatus === "approved") application.approvedAt = now;
  if (newStatus === "green_tick_issued") application.issuedAt = now;
  if (newStatus === "suspended") application.suspendedAt = now;
  if (newStatus === "revoked") application.revokedAt = now;
  await application.save();

  const actor = await greenTickActorFrom(req);
  await logStatusChange({ applicationId: application.id, masjidId: masjid.id, previousStatus, newStatus, action, actor, remarks });

  if (notify) await notifyApplicationStatus(application, { remarks });

  res.json({ application: { ...application.toJSON(), statusLabel: STATUS_LABEL[application.status] } });
}

export const markUnderReview = (req, res) => transition(req, res, {
  allowedFrom: ["submitted"], newStatus: "under_review", action: "review_started", notify: true,
});

export const requestMoreDocuments = (req, res) => transition(req, res, {
  allowedFrom: ["submitted", "under_review", "partially_verified"], newStatus: "documents_required", action: "documents_requested", notify: true,
});

export const requestClarification = (req, res) => transition(req, res, {
  allowedFrom: ["submitted", "under_review", "partially_verified"], newStatus: "clarification_required", action: "clarification_requested", notify: true,
});

export const markVerificationFailed = (req, res) => transition(req, res, {
  allowedFrom: ["submitted", "under_review", "partially_verified"], newStatus: "verification_failed", action: "verification_failed", notify: true,
});

/**
 * "Approve the complete application" — a distinct, still-guarded step
 * BEFORE issuing the actual Green Tick, per the spec's own two separate
 * statuses (Approved vs Green Tick Issued). Still re-validates every
 * mandatory condition — approval isn't a rubber stamp either.
 */
export const approveApplication = async (req, res) => {
  const ctx = await requireApplication(req, res);
  if (!ctx) return;
  const ok = await meetsIssuanceRequirements(ctx.application.id);
  if (!ok) return res.status(400).json({ message: "Not all mandatory requirements are met yet — check representatives and documents." });
  return transition(req, res, {
    allowedFrom: ["submitted", "under_review", "partially_verified"], newStatus: "approved", action: "approved", notify: true,
  });
};

/**
 * The final, deliberately guarded step — "do not allow Admin to issue
 * Green Tick accidentally through a simple toggle." Re-validates the exact
 * same mandatory conditions one more time (never trusts that nothing
 * changed between approval and this click).
 */
export const issueGreenTick = async (req, res) => {
  const ctx = await requireApplication(req, res);
  if (!ctx) return;
  const ok = await meetsIssuanceRequirements(ctx.application.id);
  if (!ok) return res.status(400).json({ message: "Not all mandatory requirements are met — the Green Tick can't be issued yet." });
  if (!ctx.application.verificationId) {
    return res.status(400).json({ message: "This application has no verification ID — it must be submitted by the masjid first." });
  }
  return transition(req, res, {
    allowedFrom: ["approved"], newStatus: "green_tick_issued", action: "green_tick_issued", notify: true,
  });
};

export const suspendApplication = (req, res) => transition(req, res, {
  allowedFrom: ["green_tick_issued"], newStatus: "suspended", action: "suspended", notify: true,
});

export const revokeApplication = (req, res) => transition(req, res, {
  allowedFrom: ["green_tick_issued", "suspended"], newStatus: "revoked", action: "revoked", notify: true,
});
