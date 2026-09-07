import User from "../models/User.js";
import AdminUser from "../models/AdminUser.js";
import GreenTickApplication from "../models/GreenTickApplication.js";
import GreenTickRepresentative from "../models/GreenTickRepresentative.js";
import GreenTickDocument from "../models/GreenTickDocument.js";
import GreenTickStatusLog from "../models/GreenTickStatusLog.js";
import VerificationDocumentType from "../models/VerificationDocumentType.js";

// Green Tick is a central Masjid attribute — every controller that needs
// its state (owner wizard, admin dashboard, or any of the public display
// surfaces) goes through this module, the same way masjidEngagementService.js
// centralized Like/Rating this session.

const MIN_REPRESENTATIVES = 3;

export async function getOrCreateApplication(masjidId) {
  const [application] = await GreenTickApplication.findOrCreate({ where: { masjidId }, defaults: { status: "draft" } });
  return application;
}

export function formatVerificationId(applicationId) {
  return `MMC-${String(applicationId).padStart(6, "0")}`;
}

/** `req.user` from the `auth` middleware is only the raw JWT payload
 * ({id, type, tv}) — no display name — so every actor needs this DB lookup
 * regardless of whether the actor is a masjid owner or an admin. */
export async function greenTickActorFrom(req) {
  if (req.user.type === "admin") {
    const admin = await AdminUser.findByPk(req.user.id, { attributes: ["name"] });
    return { type: "admin", name: admin?.name || "Admin" };
  }
  const user = await User.findByPk(req.user.id, { attributes: ["fullName"] });
  return { type: "user", name: user?.fullName || "Masjid Owner" };
}

export async function logStatusChange({
  applicationId, masjidId, representativeId = null, documentId = null,
  previousStatus = null, newStatus = null, action, actor, remarks = null,
}) {
  await GreenTickStatusLog.create({
    applicationId, masjidId, representativeId, documentId,
    previousStatus, newStatus, action,
    actorType: actor?.type || "user",
    actorName: actor?.name || null,
    remarks,
  });
}

/**
 * The "X of 10 requirements completed" tracker shown in the owner's wizard.
 * A concrete, disclosed checklist — not a vague percentage — so both the
 * owner and admin always see exactly what's outstanding.
 */
export async function computeProgress(applicationId) {
  const application = await GreenTickApplication.findByPk(applicationId);
  if (!application) return null;

  const [representatives, documents, types] = await Promise.all([
    GreenTickRepresentative.findAll({ where: { applicationId } }),
    GreenTickDocument.findAll({ where: { applicationId } }),
    VerificationDocumentType.findAll({ where: { isActive: true } }),
  ]);

  const typeById = new Map(types.map((t) => [t.id, t]));
  const docsByType = new Map();
  for (const doc of documents) {
    if (!docsByType.has(doc.documentTypeId)) docsByType.set(doc.documentTypeId, []);
    docsByType.get(doc.documentTypeId).push(doc);
  }

  const requiredMasjidTypes = types.filter((t) => t.category === "masjid" && t.isRequired);
  const requiredPropertyTypes = types.filter((t) => t.category === "property" && t.isRequired);
  const masjidPropertyDocs = documents.filter((d) => {
    const type = typeById.get(d.documentTypeId);
    return type && type.category !== "representative";
  });

  const hasRepCount = representatives.length >= MIN_REPRESENTATIVES;
  const allIdentityApproved = hasRepCount && representatives.every((r) => r.identityVerificationStatus === "approved");
  const allAuthApproved = hasRepCount && representatives.every((r) => r.authorizationStatus === "approved");
  const requiredMasjidDocsUploaded = requiredMasjidTypes.every((t) => (docsByType.get(t.id) || []).length > 0);
  const requiredPropertyDocsUploaded = requiredPropertyTypes.every((t) => (docsByType.get(t.id) || []).length > 0);
  const allMasjidPropertyDocsApproved =
    requiredMasjidDocsUploaded && requiredPropertyDocsUploaded &&
    masjidPropertyDocs.length > 0 && masjidPropertyDocs.every((d) => d.status === "approved");

  const checklist = [
    { key: "masjid_info", label: "Masjid information confirmed", done: true },
    { key: "representatives_added", label: `At least ${MIN_REPRESENTATIVES} representatives added`, done: hasRepCount },
    { key: "identity_verified", label: "All representatives' identity verified", done: allIdentityApproved },
    { key: "authorization_verified", label: "All representatives' authorization verified", done: allAuthApproved },
    { key: "masjid_documents", label: "Required masjid documents uploaded", done: requiredMasjidDocsUploaded },
    { key: "property_documents", label: "Required property documents uploaded", done: requiredPropertyDocsUploaded },
    { key: "documents_approved", label: "All masjid/property documents approved", done: allMasjidPropertyDocsApproved },
    { key: "submitted", label: "Application submitted", done: application.status !== "draft" },
    { key: "reviewed", label: "Admin review complete", done: ["approved", "green_tick_issued"].includes(application.status) },
    { key: "issued", label: "Green Tick issued", done: application.status === "green_tick_issued" },
  ];

  return { completed: checklist.filter((c) => c.done).length, total: checklist.length, checklist };
}

// Only the substantive, checkable requirements — "submitted"/"reviewed"/
// "issued" on the checklist are workflow-status markers (consequences of
// the admin's own actions), not independent conditions to re-verify here.
const ISSUANCE_CHECKLIST_KEYS = [
  "representatives_added", "identity_verified", "authorization_verified",
  "masjid_documents", "property_documents", "documents_approved",
];

/** The mandatory-condition guard for issuing the Green Tick — reused by both computeProgress (for display) and the admin issueGreenTick endpoint (for enforcement), so the two can never drift apart. */
export async function meetsIssuanceRequirements(applicationId) {
  const progress = await computeProgress(applicationId);
  if (!progress) return false;
  return progress.checklist
    .filter((c) => ISSUANCE_CHECKLIST_KEYS.includes(c.key))
    .every((c) => c.done);
}

function badgeInfoFrom(application) {
  // Named `greenTickStatus` (never bare `status`) specifically because every
  // caller spreads this alongside `masjid.toJSON()`, which already has its
  // own `status` (the approval status draft/approved/etc.) — a bare
  // `status` key here would silently clobber it.
  if (!application) return { greenTickStatus: null, verificationId: null, issuedAt: null, isGreenTick: false };
  return {
    greenTickStatus: application.status,
    verificationId: application.verificationId,
    issuedAt: application.issuedAt,
    isGreenTick: application.status === "green_tick_issued",
  };
}

/** Single-masjid badge/status lookup — the shape every display surface reads. */
export async function getGreenTickBadgeInfo(masjidId) {
  const application = await GreenTickApplication.findOne({ where: { masjidId } });
  return badgeInfoFrom(application);
}

/** Batch version for list surfaces — one query for the whole page, mirroring masjidEngagementService.js's getEngagementForMany. */
export async function getGreenTickBadgeInfoForMany(masjidIds) {
  const result = new Map();
  if (!masjidIds.length) return result;
  const applications = await GreenTickApplication.findAll({ where: { masjidId: masjidIds } });
  const byMasjid = new Map(applications.map((a) => [a.masjidId, a]));
  for (const id of masjidIds) result.set(id, badgeInfoFrom(byMasjid.get(id)));
  return result;
}
