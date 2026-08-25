import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import Campaign from "../models/Campaign.js";
import CampaignPhoto from "../models/CampaignPhoto.js";
import CampaignBudgetItem from "../models/CampaignBudgetItem.js";
import CampaignDocument from "../models/CampaignDocument.js";
import CampaignHistory from "../models/CampaignHistory.js";
import Donation from "../models/Donation.js";
import Masjid from "../models/Masjid.js";
import { amountRaised } from "./campaignController.js";
import { recordCampaignApprovedActivity, recordDonationActivity, recordMilestoneActivity } from "../services/communityActivityService.js";

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

    const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;
    res.json({
      campaign: { ...campaign.toJSON(), amountRaised: raised, progressPercent: goal ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : null },
      photos,
      budgetItems,
      documents,
      history,
      donations,
      masjid,
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

export const downloadDocument = async (req, res) => {
  try {
    const doc = await CampaignDocument.findOne({ where: { id: req.params.docId, campaignId: req.params.id } });
    if (!doc || !fs.existsSync(doc.storedPath)) return res.status(404).json({ message: "Document not found." });
    res.download(path.resolve(doc.storedPath), doc.fileName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
