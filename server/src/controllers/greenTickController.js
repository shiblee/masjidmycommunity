import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import Masjid from "../models/Masjid.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import GreenTickApplication from "../models/GreenTickApplication.js";
import GreenTickRepresentative from "../models/GreenTickRepresentative.js";
import GreenTickDocument from "../models/GreenTickDocument.js";
import GreenTickStatusLog from "../models/GreenTickStatusLog.js";
import VerificationDocumentType from "../models/VerificationDocumentType.js";
import {
  getOrCreateApplication,
  formatVerificationId,
  greenTickActorFrom,
  logStatusChange,
  computeProgress,
  meetsSubmissionRequirements,
} from "../services/greenTickService.js";

// Mirrors masjidController.js's own EDITABLE_STATUSES gate — the owner can
// only add/remove representatives or upload/delete documents while the
// application hasn't left their hands yet. Once submitted, only admin
// actions (or an explicit "documents required"/"clarification required"/
// "verification failed" bounce-back) move it again. "verification_failed"
// is included here — otherwise a failed application became a permanent
// dead end: no admin action ever moves it forward again, and without this
// the owner couldn't get back into the wizard to fix anything either.
const EDITABLE_STATUSES = new Set(["draft", "documents_required", "clarification_required", "verification_failed"]);

async function findOwnedMasjid(req, res) {
  const masjid = await Masjid.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!masjid) {
    res.status(404).json({ message: "Masjid not found." });
    return null;
  }
  return masjid;
}

function withoutStoredPath(doc) {
  const json = doc.toJSON();
  delete json.storedPath;
  return json;
}

export const getApplication = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;

    let application = await GreenTickApplication.findOne({ where: { masjidId: masjid.id } });
    if (!application) {
      if (masjid.status !== "approved") {
        return res.status(400).json({ message: "Your masjid must be approved before applying for the Green Tick." });
      }
      application = await getOrCreateApplication(masjid.id);
    }

    const [representatives, documents, documentTypes, verifiedContacts, progress, timeline] = await Promise.all([
      GreenTickRepresentative.findAll({ where: { applicationId: application.id } }),
      GreenTickDocument.findAll({ where: { applicationId: application.id } }),
      VerificationDocumentType.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]] }),
      MasjidContactPerson.findAll({ where: { masjidId: masjid.id, verified: true } }),
      computeProgress(application.id),
      GreenTickStatusLog.findAll({ where: { applicationId: application.id }, order: [["createdAt", "DESC"]] }),
    ]);

    const contactById = new Map(verifiedContacts.map((c) => [c.id, c]));
    const linkedContactIds = new Set(representatives.map((r) => r.contactPersonId));

    res.json({
      masjidStatus: masjid.status,
      editable: EDITABLE_STATUSES.has(application.status),
      application,
      progress,
      timeline,
      documentTypes,
      representatives: representatives.map((r) => {
        const c = contactById.get(r.contactPersonId);
        return { ...r.toJSON(), contact: c ? { id: c.id, name: c.name, designation: c.designation, mobile: c.mobile } : null };
      }),
      documents: documents.map(withoutStoredPath),
      eligibleContacts: verifiedContacts
        .filter((c) => !linkedContactIds.has(c.id))
        .map((c) => ({ id: c.id, name: c.name, designation: c.designation, mobile: c.mobile })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addRepresentative = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (masjid.status !== "approved") return res.status(400).json({ message: "Only an approved masjid can apply for the Green Tick." });

    const application = await getOrCreateApplication(masjid.id);
    if (!EDITABLE_STATUSES.has(application.status)) return res.status(400).json({ message: "This application can't be edited right now." });

    const contact = await MasjidContactPerson.findOne({ where: { id: req.body.contactPersonId, masjidId: masjid.id } });
    if (!contact) return res.status(404).json({ message: "Contact person not found." });
    if (!contact.verified) return res.status(400).json({ message: "This person's mobile number must be verified before they can be added as a representative." });

    const existing = await GreenTickRepresentative.findOne({ where: { applicationId: application.id, contactPersonId: contact.id } });
    if (existing) return res.status(409).json({ message: "This person is already added as a representative." });

    const representative = await GreenTickRepresentative.create({ applicationId: application.id, contactPersonId: contact.id });
    const actor = await greenTickActorFrom(req);
    await logStatusChange({
      applicationId: application.id, masjidId: masjid.id, representativeId: representative.id,
      action: "representative_added", actor, remarks: `${contact.name} (${contact.designation}) added as a representative.`,
    });

    res.status(201).json({
      representative: { ...representative.toJSON(), contact: { id: contact.id, name: contact.name, designation: contact.designation, mobile: contact.mobile } },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeRepresentative = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const application = await getOrCreateApplication(masjid.id);
    if (!EDITABLE_STATUSES.has(application.status)) return res.status(400).json({ message: "This application can't be edited right now." });

    const representative = await GreenTickRepresentative.findOne({ where: { id: req.params.repId, applicationId: application.id } });
    if (!representative) return res.status(404).json({ message: "Representative not found." });

    const docs = await GreenTickDocument.findAll({ where: { representativeId: representative.id } });
    docs.forEach((d) => fs.unlink(d.storedPath, () => {}));
    await GreenTickDocument.destroy({ where: { representativeId: representative.id } });
    await representative.destroy();

    const actor = await greenTickActorFrom(req);
    await logStatusChange({ applicationId: application.id, masjidId: masjid.id, action: "representative_removed", actor });

    res.json({ removed: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadDocuments = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const application = await getOrCreateApplication(masjid.id);
    if (!EDITABLE_STATUSES.has(application.status)) return res.status(400).json({ message: "This application can't be edited right now." });
    if (!req.files?.length) return res.status(400).json({ message: "No documents were uploaded." });

    const cleanupFiles = () => req.files.forEach((f) => fs.unlink(f.path, () => {}));
    const reject = (status, message) => {
      cleanupFiles();
      return res.status(status).json({ message });
    };

    const { documentTypeId, representativeId, documentNumber, issueDate, expiryDate } = req.body;
    const type = await VerificationDocumentType.findOne({ where: { id: documentTypeId, isActive: true } });
    if (!type) return reject(400, "Invalid document type.");

    let representative = null;
    if (representativeId) {
      representative = await GreenTickRepresentative.findOne({ where: { id: representativeId, applicationId: application.id } });
      if (!representative) return reject(404, "Representative not found.");
      if (type.category !== "representative") return reject(400, "That document type isn't a representative identity document.");
    } else if (type.category === "representative") {
      return reject(400, "Select which representative this identity document belongs to.");
    }

    // This type's own number/format/size rules (Admin Panel → Meta →
    // Verification Document Types) — a null allowedFormats/maxFileSizeMB
    // means "use the global default", already enforced coarsely by
    // uploadGreenTickDocuments' multer config; this is the precise, per-type
    // gate on top of it. Multer's fileFilter can't see req.body reliably
    // (multipart field order isn't guaranteed), so this has to happen here,
    // after the whole request is parsed.
    if (type.documentNumberRequired && !documentNumber?.trim()) {
      return reject(400, `A document number is required for "${type.name}".`);
    }

    if (type.allowedFormats) {
      const allowed = new Set(type.allowedFormats.split(",").map((f) => f.trim().toLowerCase()).filter(Boolean));
      const badFile = req.files.find((f) => !allowed.has(f.originalname.split(".").pop()?.toLowerCase()));
      if (badFile) return reject(400, `"${type.name}" only accepts: ${type.allowedFormats.toUpperCase()}.`);
    }

    if (type.maxFileSizeMB) {
      const maxBytes = type.maxFileSizeMB * 1024 * 1024;
      if (req.files.some((f) => f.size > maxBytes)) {
        return reject(400, `"${type.name}" documents must be under ${type.maxFileSizeMB}MB.`);
      }
    }

    const created = await Promise.all(
      req.files.map((file) =>
        GreenTickDocument.create({
          applicationId: application.id,
          representativeId: representative?.id || null,
          documentTypeId: type.id,
          fileName: file.originalname,
          storedPath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          documentNumber: documentNumber?.trim() || null,
          issueDate: issueDate || null,
          expiryDate: expiryDate || null,
          uploadedBy: req.user.id,
        })
      )
    );

    const actor = await greenTickActorFrom(req);
    await Promise.all(
      created.map((doc) =>
        logStatusChange({
          applicationId: application.id, masjidId: masjid.id, representativeId: doc.representativeId, documentId: doc.id,
          action: "document_uploaded", actor, remarks: `${type.name}: ${doc.fileName}`,
        })
      )
    );

    res.status(201).json({ documents: created.map(withoutStoredPath) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const application = await getOrCreateApplication(masjid.id);
    if (!EDITABLE_STATUSES.has(application.status)) return res.status(400).json({ message: "This application can't be edited right now." });

    const doc = await GreenTickDocument.findOne({ where: { id: req.params.docId, applicationId: application.id } });
    if (!doc) return res.status(404).json({ message: "Document not found." });
    fs.unlink(doc.storedPath, () => {});
    await doc.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Owner's own document download — ownership-checked, never a public URL. */
export const downloadDocument = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const application = await GreenTickApplication.findOne({ where: { masjidId: masjid.id } });
    const doc = application && await GreenTickDocument.findOne({ where: { id: req.params.docId, applicationId: application.id } });
    if (!doc || !fs.existsSync(doc.storedPath)) return res.status(404).json({ message: "Document not found." });
    res.download(path.resolve(doc.storedPath), doc.fileName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitApplication = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (masjid.status !== "approved") return res.status(400).json({ message: "Only an approved masjid can apply for the Green Tick." });

    const application = await getOrCreateApplication(masjid.id);
    if (!EDITABLE_STATUSES.has(application.status)) return res.status(400).json({ message: "This application has already been submitted." });

    const check = await meetsSubmissionRequirements(application.id);
    if (!check.ok) return res.status(400).json({ message: check.reason });

    if (req.body.confirmed !== true) {
      return res.status(400).json({ message: "You must confirm the documents you've uploaded before submitting." });
    }

    const previousStatus = application.status;
    application.status = "submitted";
    application.submittedAt = new Date();
    if (!application.verificationId) application.verificationId = formatVerificationId(application.id);
    await application.save();

    const actor = await greenTickActorFrom(req);
    // Two log rows on purpose: the status transition itself, and a separate,
    // explicitly named audit entry for the confirmation checkbox — "recorded
    // with date/time [createdAt] and user ID [actor.id]" per the spec.
    await logStatusChange({
      applicationId: application.id, masjidId: masjid.id,
      previousStatus, newStatus: "submitted", action: "submitted", actor,
    });
    await logStatusChange({
      applicationId: application.id, masjidId: masjid.id,
      action: "submission_confirmed", actor,
      remarks: "Owner confirmed the uploaded documents are genuine and accurate before submitting.",
    });

    res.json({ application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * The Green Tick certificate — only ever available once the tick is
 * actually issued. Generates a QR code (server-side, via the `qrcode`
 * package) pointing at the public verification page rather than shipping a
 * downloadable PDF/image file, per the agreed scope — the certificate is a
 * page the masjid can view/print/share, not a generated binary artifact.
 */
export const getCertificate = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const application = await GreenTickApplication.findOne({ where: { masjidId: masjid.id } });
    if (!application || application.status !== "green_tick_issued") {
      return res.status(400).json({ message: "This masjid doesn't have an active Green Tick certificate." });
    }

    const verifyUrl = `http://localhost:5173/verify-masjid/${application.verificationId}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });

    res.json({
      masjidName: masjid.name,
      masjidCategory: masjid.category,
      verificationId: application.verificationId,
      issuedAt: application.issuedAt,
      verifyUrl,
      qrDataUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
