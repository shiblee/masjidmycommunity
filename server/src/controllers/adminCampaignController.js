import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import Campaign from "../models/Campaign.js";
import CampaignPhoto from "../models/CampaignPhoto.js";
import CampaignBudgetItem from "../models/CampaignBudgetItem.js";
import CampaignDocument from "../models/CampaignDocument.js";
import CampaignHistory from "../models/CampaignHistory.js";
import CampaignUpdate from "../models/CampaignUpdate.js";
import Donation from "../models/Donation.js";
import Masjid from "../models/Masjid.js";
import User from "../models/User.js";
import { amountRaised, serializeCampaign, generateUniqueSlug } from "./campaignController.js";
import { recordCampaignApprovedActivity, recordDonationActivity, recordMilestoneActivity } from "../services/communityActivityService.js";
import { sendCampaignApprovedEmail, sendCampaignRejectedEmail, sendCampaignChangesRequestedEmail, sendCampaignStatusUpdatedEmail } from "../services/emailService.js";
import { notifyUser } from "../services/notificationService.js";
import { mediaTypeOf, IMAGE_MAX_BYTES } from "../middleware/upload.js";
import { PLATFORM_EMAIL } from "../seed/platformUserDefaults.js";
import { getGreenTickBadgeInfo } from "../services/greenTickService.js";

// Editing these material fields mirrors the owner's own CORE_FIELDS list —
// see campaignController.js's update() for the full rationale.
const CORE_FIELDS = ["title", "shortDescription", "description", "goalAmount", "endDate", "categoryId", "donationType", "zakatEligibilityNote"];

async function logHistory(campaignId, action, note, actorName) {
  await CampaignHistory.create({ campaignId, action, actorType: "admin", actorName: actorName || "Admin", note: note || null });
}

const STATUSES = ["draft", "submitted", "under_review", "changes_requested", "approved", "active", "paused", "goal_reached", "completed", "rejected", "cancelled"];
const UNDER_REVIEW_STATUSES = ["submitted", "under_review", "changes_requested"];

export const listAll = async (req, res) => {
  try {
    const { status, q, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (q) where.title = { [Op.like]: `%${q}%` };

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await Campaign.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });
    const campaigns = await Promise.all(
      rows.map(async (c) => {
        const [cover, masjid, raised] = await Promise.all([
          CampaignPhoto.findOne({ where: { campaignId: c.id, isCover: true } }),
          Masjid.findByPk(c.masjidId, { attributes: ["id", "name"] }),
          amountRaised(c.id),
        ]);
        const goal = c.goalAmount ? Number(c.goalAmount) : null;
        return { ...c.toJSON(), coverPhotoUrl: cover?.url || null, masjid, amountRaised: raised, progressPercent: goal ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : null };
      })
    );

    const counts = {};
    for (const s of STATUSES) counts[s] = await Campaign.count({ where: { status: s } });

    res.json({ campaigns, total: count, page: Number(page) || 1, pageSize: limit, counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin-created campaigns skip the Green Tick / ownership gates the owner
// wizard enforces — an admin has full rights to raise a campaign for any
// masjid on the platform's behalf. Attributed to the platform account
// (mirrors adminMasjidController.js's createMasjid) rather than any real
// user, so provenance stays honest.
export const create = async (req, res) => {
  try {
    const { masjidId, title } = req.body;
    if (!masjidId) return res.status(400).json({ message: "Select a masjid for this campaign." });
    if (!title?.trim()) return res.status(400).json({ message: "Campaign title is required." });

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const platformUser = await User.findOne({ where: { email: PLATFORM_EMAIL } });
    if (!platformUser) return res.status(500).json({ message: "Platform account is not configured." });

    const slug = await generateUniqueSlug(title);
    const campaign = await Campaign.create({ masjidId, createdBy: platformUser.id, title: title.trim(), slug, status: "draft" });
    await logHistory(campaign.id, "admin_created", null, req.user.email);
    res.status(201).json({ campaign: await serializeCampaign(campaign) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    const [photos, budgetItems, documents, history, donations, masjid, raised] = await Promise.all([
      CampaignPhoto.findAll({ where: { campaignId: campaign.id }, order: [["sortOrder", "ASC"]] }),
      CampaignBudgetItem.findAll({ where: { campaignId: campaign.id }, order: [["sortOrder", "ASC"]] }),
      CampaignDocument.findAll({ where: { campaignId: campaign.id }, attributes: ["id", "documentType", "fileName", "createdAt"] }),
      CampaignHistory.findAll({ where: { campaignId: campaign.id }, order: [["createdAt", "DESC"]] }),
      Donation.findAll({ where: { campaignId: campaign.id }, order: [["createdAt", "DESC"]] }),
      Masjid.findByPk(campaign.masjidId),
      amountRaised(campaign.id),
    ]);
    const greenTick = masjid ? await getGreenTickBadgeInfo(masjid.id) : null;

    const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;
    res.json({
      campaign: { ...campaign.toJSON(), amountRaised: raised, progressPercent: goal ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : null },
      photos,
      budgetItems,
      documents,
      history,
      donations,
      masjid: masjid ? { ...masjid.toJSON(), ...greenTick } : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approve = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    if (!UNDER_REVIEW_STATUSES.includes(campaign.status)) {
      return res.status(400).json({ message: "Only campaigns under review can be approved." });
    }

    // Approval takes the campaign straight live (mirrors the Masjid approval
    // flow) — "approved" stays a valid historical/status value but campaigns
    // don't rest there waiting for a separate publish step.
    campaign.status = "active";
    campaign.adminFeedback = null;
    campaign.reviewedAt = new Date();
    campaign.approvedAt = new Date();
    if (req.body.islamicReviewNotes !== undefined) campaign.islamicReviewNotes = req.body.islamicReviewNotes;
    if (req.body.complianceReviewNotes !== undefined) campaign.complianceReviewNotes = req.body.complianceReviewNotes;
    await campaign.save();
    await logHistory(campaign.id, "approved", req.body.note, req.user.email);

    const [cover, masjid] = await Promise.all([
      CampaignPhoto.findOne({ where: { campaignId: campaign.id, isCover: true } }),
      Masjid.findByPk(campaign.masjidId),
    ]);
    await recordCampaignApprovedActivity(campaign, masjid, cover?.url || null);

    const owner = await User.findByPk(campaign.createdBy);
    if (owner) {
      sendCampaignApprovedEmail(campaign, owner, masjid).catch(() => {});
      notifyUser({
        userId: owner.id,
        type: "campaign_approved",
        title: "Your campaign is now live",
        body: `"${campaign.title}" has been approved and is now live.`,
        link: `/account/my-campaigns/${campaign.id}`,
        relatedCampaignId: campaign.id,
      }).catch(() => {});
    }

    res.json({ campaign: campaign.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reject = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "A rejection reason is required." });

    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    campaign.status = "rejected";
    campaign.adminFeedback = reason.trim();
    campaign.reviewedAt = new Date();
    await campaign.save();
    await logHistory(campaign.id, "rejected", reason.trim(), req.user.email);

    const [owner, masjid] = await Promise.all([User.findByPk(campaign.createdBy), Masjid.findByPk(campaign.masjidId)]);
    if (owner) {
      sendCampaignRejectedEmail(campaign, owner, masjid).catch(() => {});
      notifyUser({
        userId: owner.id,
        type: "campaign_rejected",
        title: "Your campaign was not approved",
        body: `"${campaign.title}" was rejected: ${reason.trim()}`,
        link: `/account/my-campaigns/${campaign.id}`,
        relatedCampaignId: campaign.id,
      }).catch(() => {});
    }

    res.json({ campaign: campaign.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestChanges = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: "Describe what needs to change." });

    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    campaign.status = "changes_requested";
    campaign.adminFeedback = note.trim();
    campaign.reviewedAt = new Date();
    await campaign.save();
    await logHistory(campaign.id, "changes_requested", note.trim(), req.user.email);

    const [owner, masjid] = await Promise.all([User.findByPk(campaign.createdBy), Masjid.findByPk(campaign.masjidId)]);
    if (owner) {
      sendCampaignChangesRequestedEmail(campaign, owner, masjid).catch(() => {});
      notifyUser({
        userId: owner.id,
        type: "campaign_changes_requested",
        title: "Admin requested changes to your campaign",
        body: `Changes have been requested for "${campaign.title}": ${note.trim()}`,
        link: `/account/my-campaigns/${campaign.id}`,
        relatedCampaignId: campaign.id,
      }).catch(() => {});
    }

    res.json({ campaign: campaign.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: "Note can't be empty." });
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    await logHistory(campaign.id, "note", note.trim(), req.user.email);
    const history = await CampaignHistory.findAll({ where: { campaignId: campaign.id }, order: [["createdAt", "DESC"]] });
    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const STATUS_LABEL = {
  paused: "Paused", active: "Active", completed: "Completed", cancelled: "Cancelled", goal_reached: "Goal Reached",
};

async function transition(req, res, { from, to, action }) {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    if (!from.includes(campaign.status)) {
      return res.status(400).json({ message: `This campaign can't be ${action.replace("_", " ")} right now.` });
    }
    campaign.status = to;
    if (to === "completed") campaign.completedAt = new Date();
    await campaign.save();
    await logHistory(campaign.id, action, null, req.user.email);

    const [owner, masjid] = await Promise.all([User.findByPk(campaign.createdBy), Masjid.findByPk(campaign.masjidId)]);
    if (owner) {
      const statusLabel = STATUS_LABEL[to] || to;
      sendCampaignStatusUpdatedEmail(campaign, owner, masjid, statusLabel).catch(() => {});
      notifyUser({
        userId: owner.id,
        type: "campaign_status_updated",
        title: "Your campaign status changed",
        body: `"${campaign.title}" is now ${statusLabel}.`,
        link: `/account/my-campaigns/${campaign.id}`,
        relatedCampaignId: campaign.id,
      }).catch(() => {});
    }

    res.json({ campaign: campaign.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export const pause = (req, res) => transition(req, res, { from: ["active", "goal_reached"], to: "paused", action: "paused" });
export const resume = (req, res) => transition(req, res, { from: ["paused"], to: "active", action: "resumed" });
export const markCompleted = (req, res) => transition(req, res, { from: ["active", "paused", "goal_reached"], to: "completed", action: "marked_completed" });
export const cancel = (req, res) => transition(req, res, { from: ["draft", "submitted", "under_review", "changes_requested", "approved", "active", "paused"], to: "cancelled", action: "cancelled" });

export const recordDonation = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    if (!["active", "paused", "goal_reached"].includes(campaign.status)) {
      return res.status(400).json({ message: "Donations can only be recorded for a live campaign." });
    }

    const { donorName, donorEmail, amount, currency, method, donationType, notes } = req.body;
    if (!(Number(amount) > 0)) return res.status(400).json({ message: "Enter a donation amount greater than zero." });

    const beforeRaised = await amountRaised(campaign.id);
    const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;
    const beforePercent = goal ? Math.min(100, (beforeRaised / goal) * 100) : 0;

    const donation = await Donation.create({
      campaignId: campaign.id,
      donorName: donorName?.trim() || null,
      donorEmail: donorEmail?.trim() || null,
      amount,
      currency: currency || campaign.currency,
      method: method || "upi",
      donationType: donationType || campaign.donationType,
      notes: notes?.trim() || null,
      recordedBy: req.user.id,
    });
    await logHistory(campaign.id, "donation_recorded", `${currency || campaign.currency} ${amount} via ${method || "upi"}`, req.user.email);

    const afterRaised = await amountRaised(campaign.id);
    const afterPercent = goal ? Math.min(100, (afterRaised / goal) * 100) : 0;

    if (campaign.status === "active" && goal && afterRaised >= goal) {
      campaign.status = "goal_reached";
      await campaign.save();
    }

    await recordDonationActivity(campaign, donation);
    if (goal) await recordMilestoneActivity(campaign, beforePercent, afterPercent);

    res.status(201).json({ donation, amountRaised: afterRaised });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hard delete — no admin campaign-delete path existed before this (owner
// side has no delete either, only reject/cancel, which don't remove the
// row). Restricted to campaigns with zero recorded donations since a
// campaign that's ever received real money is real financial history, not
// disposable data.
export const remove = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    const donationCount = await Donation.count({ where: { campaignId: campaign.id } });
    if (donationCount > 0) {
      return res.status(409).json({ message: "This campaign has recorded donations and cannot be deleted.", donationCount });
    }

    const documents = await CampaignDocument.findAll({ where: { campaignId: campaign.id } });

    await sequelize.transaction(async (t) => {
      await CampaignPhoto.destroy({ where: { campaignId: campaign.id }, transaction: t });
      await CampaignBudgetItem.destroy({ where: { campaignId: campaign.id }, transaction: t });
      await CampaignDocument.destroy({ where: { campaignId: campaign.id }, transaction: t });
      await CampaignHistory.destroy({ where: { campaignId: campaign.id }, transaction: t });
      await CampaignUpdate.destroy({ where: { campaignId: campaign.id }, transaction: t });
      await campaign.destroy({ transaction: t });
    });

    for (const doc of documents) fs.unlink(doc.storedPath, () => {});

    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin field-level edit — same CORE_FIELDS as the owner's own update(),
// but without the "material change on a live campaign forces re-review"
// step, since the admin editing it *is* the review.
export const updateFields = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    for (const field of ["goalAmount", "endDate", "categoryId", "zakatEligibilityNote"]) {
      if (req.body[field] === "") req.body[field] = null;
    }
    if (req.body.title !== undefined && !req.body.title?.trim()) {
      return res.status(400).json({ message: "Campaign title can't be empty." });
    }
    if ((req.body.donationType ?? campaign.donationType) === "Zakat" && !(req.body.zakatEligibilityNote ?? campaign.zakatEligibilityNote)?.trim()) {
      return res.status(400).json({ message: "Explain how this campaign qualifies for Zakat." });
    }
    if (req.body.goalAmount !== undefined && req.body.goalAmount !== null && Number(req.body.goalAmount) <= 0) {
      return res.status(400).json({ message: "Funding goal must be greater than zero." });
    }

    const changedLabels = [];
    for (const field of CORE_FIELDS) {
      if (req.body[field] === undefined) continue;
      const next = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      if (String(campaign[field] ?? "") !== String(next ?? "")) changedLabels.push(field);
      campaign[field] = next;
    }

    // Slug never auto-regenerates when the title changes (a live campaign's
    // URL may already be shared/bookmarked — silently changing it would
    // 404 those links) — same deliberate stance as adminMasjidController.js's
    // own manual slug field. An admin who wants the URL to catch up sets it
    // here explicitly.
    if (req.body.slug !== undefined) {
      const slug = req.body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) return res.status(400).json({ field: "slug", message: "URL slug can't be empty." });
      const existing = await Campaign.findOne({ where: { slug, id: { [Op.ne]: campaign.id } } });
      if (existing) return res.status(400).json({ field: "slug", message: "That URL slug is already in use by another campaign." });
      if (slug !== campaign.slug) changedLabels.push("slug");
      campaign.slug = slug;
    }

    await campaign.save();
    if (changedLabels.length) await logHistory(campaign.id, "admin_updated", `Updated: ${changedLabels.join(", ")}`, req.user.email);

    res.json({ campaign: await serializeCampaign(campaign) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadPhotos = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    if (!req.files?.length) return res.status(400).json({ message: "No photos or videos were uploaded." });

    const oversizedImage = req.files.find((file) => mediaTypeOf(file.mimetype) === "photo" && file.size > IMAGE_MAX_BYTES);
    if (oversizedImage) {
      req.files.forEach((file) => fs.unlink(file.path, () => {}));
      return res.status(400).json({ message: `Photos must be under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB. "${oversizedImage.originalname}" is too large.` });
    }

    const existingCount = await CampaignPhoto.count({ where: { campaignId: campaign.id } });
    let coverAssigned = (await CampaignPhoto.count({ where: { campaignId: campaign.id, isCover: true } })) > 0;

    const created = await Promise.all(
      req.files.map((file, i) => {
        const mediaType = mediaTypeOf(file.mimetype);
        const isCover = !coverAssigned && mediaType === "photo";
        if (isCover) coverAssigned = true;
        return CampaignPhoto.create({
          campaignId: campaign.id,
          url: `/uploads/campaign-photos/${file.filename}`,
          mediaType,
          isCover,
          sortOrder: existingCount + i,
        });
      })
    );
    await logHistory(campaign.id, "admin_added_photos", `Added ${created.length} photo(s)/video(s)`, req.user.email);
    res.status(201).json({ photos: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePhoto = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    const photo = await CampaignPhoto.findOne({ where: { id: req.params.photoId, campaignId: campaign.id } });
    if (!photo) return res.status(404).json({ message: "Photo not found." });

    if (req.body.sortOrder !== undefined) photo.sortOrder = req.body.sortOrder;
    if (req.body.isCover) {
      if (photo.mediaType === "video") return res.status(400).json({ message: "A video can't be set as the cover — it shows as a still image across the site." });
      await CampaignPhoto.update({ isCover: false }, { where: { campaignId: campaign.id } });
      photo.isCover = true;
    }
    await photo.save();
    res.json({ photo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePhoto = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    const photo = await CampaignPhoto.findOne({ where: { id: req.params.photoId, campaignId: campaign.id } });
    if (!photo) return res.status(404).json({ message: "Photo not found." });
    await photo.destroy();
    await logHistory(campaign.id, "admin_removed_photo", null, req.user.email);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadDocuments = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    if (!req.files?.length) return res.status(400).json({ message: "No documents were uploaded." });

    const created = await Promise.all(
      req.files.map((file) =>
        CampaignDocument.create({
          campaignId: campaign.id,
          documentType: req.body.documentType || "other",
          fileName: file.originalname,
          storedPath: file.path,
          uploadedBy: req.user.id,
        })
      )
    );
    await logHistory(campaign.id, "admin_added_documents", `Added ${created.length} document(s)`, req.user.email);
    res.status(201).json({ documents: created.map((d) => ({ id: d.id, documentType: d.documentType, fileName: d.fileName, createdAt: d.createdAt })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    const doc = await CampaignDocument.findOne({ where: { id: req.params.docId, campaignId: campaign.id } });
    if (!doc) return res.status(404).json({ message: "Document not found." });
    fs.unlink(doc.storedPath, () => {});
    await doc.destroy();
    await logHistory(campaign.id, "admin_removed_document", null, req.user.email);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const doc = await CampaignDocument.findOne({ where: { id: req.params.docId, campaignId: req.params.id } });
    if (!doc || !fs.existsSync(doc.storedPath)) return res.status(404).json({ message: "Document not found." });
    res.download(path.resolve(doc.storedPath), doc.fileName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
