import { Op } from "sequelize";
import Campaign from "../models/Campaign.js";
import CampaignPhoto from "../models/CampaignPhoto.js";
import CampaignBudgetItem from "../models/CampaignBudgetItem.js";
import CampaignCategory from "../models/CampaignCategory.js";
import CampaignClassification from "../models/CampaignClassification.js";
import CampaignUpdate from "../models/CampaignUpdate.js";
import Masjid from "../models/Masjid.js";
import MasjidDonationAccount from "../models/MasjidDonationAccount.js";
import Donation from "../models/Donation.js";
import { getEngagementFor } from "../services/masjidEngagementService.js";
import { amountRaised } from "./campaignController.js";
import { notifyAdmins } from "../services/adminAlertService.js";

const PUBLIC_STATUSES = ["active", "paused", "goal_reached", "completed"];

function maskAccountNumber(digits) {
  if (!digits) return digits;
  return digits.length <= 4 ? digits : `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

async function withCard(campaign) {
  const [cover, masjid, raised, category, donorCount] = await Promise.all([
    CampaignPhoto.findOne({ where: { campaignId: campaign.id, isCover: true } }),
    Masjid.findByPk(campaign.masjidId, { attributes: ["id", "name", "city", "country"] }),
    amountRaised(campaign.id),
    campaign.categoryId ? CampaignCategory.findByPk(campaign.categoryId, { attributes: ["id", "name"] }) : null,
    Donation.count({ where: { campaignId: campaign.id, status: "recorded" } }),
  ]);
  const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;
  return {
    ...campaign.toJSON(),
    coverPhotoUrl: cover?.url || null,
    masjid,
    category,
    amountRaised: raised,
    donorCount,
    progressPercent: goal ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : null,
  };
}

export const listPublic = async (req, res) => {
  try {
    const { q, categoryId, donationType, page = 1, pageSize = 12 } = req.query;
    const where = { status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" };
    if (categoryId) where.categoryId = categoryId;
    if (donationType) where.donationType = donationType;
    if (q) where[Op.or] = [{ title: { [Op.like]: `%${q}%` } }, { shortDescription: { [Op.like]: `%${q}%` } }];

    const limit = Math.min(Number(pageSize) || 12, 48);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await Campaign.findAndCountAll({ where, order: [["approvedAt", "DESC"]], limit, offset });
    const campaigns = await Promise.all(rows.map(withCard));

    res.json({ campaigns, total: count, page: Number(page) || 1, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicOne = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ where: { slug: req.params.slug, status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" } });
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    const [photos, budgetItems, updates, masjid, raised, category, donorCount] = await Promise.all([
      CampaignPhoto.findAll({ where: { campaignId: campaign.id }, order: [["sortOrder", "ASC"]] }),
      CampaignBudgetItem.findAll({ where: { campaignId: campaign.id }, order: [["sortOrder", "ASC"]] }),
      CampaignUpdate.findAll({ where: { campaignId: campaign.id }, order: [["createdAt", "DESC"]] }),
      Masjid.findByPk(campaign.masjidId, { attributes: ["id", "name", "city", "country", "tagline"] }),
      amountRaised(campaign.id),
      campaign.categoryId ? CampaignCategory.findByPk(campaign.categoryId, { attributes: ["id", "name"] }) : null,
      Donation.count({ where: { campaignId: campaign.id, status: "recorded" } }),
    ]);

    const [donationAccount, masjidEngagement] = await Promise.all([
      MasjidDonationAccount.findOne({ where: { masjidId: campaign.masjidId, verified: true } }),
      getEngagementFor(campaign.masjidId, req.user?.id),
    ]);
    const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;

    res.json({
      campaign: {
        ...campaign.toJSON(),
        amountRaised: raised,
        donorCount,
        progressPercent: goal ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : null,
      },
      photos,
      budgetItems,
      updates,
      masjid: masjid ? { ...masjid.toJSON(), ...masjidEngagement } : null,
      category,
      donationAccount: donationAccount
        ? {
            upiId: donationAccount.upiId,
            upiAccountHolder: donationAccount.upiAccountHolder,
            bankName: donationAccount.bankName,
            accountHolderName: donationAccount.accountHolderName,
            accountNumberMasked: maskAccountNumber(donationAccount.accountNumber),
            ifscCode: donationAccount.ifscCode,
            branchName: donationAccount.branchName,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Public donor list for the campaign hub's "Recent Donors"/"View All Donors"
// panels — deliberately never returns donorEmail (no consent/privacy field
// exists on Donation today, so contact info stays server-side only; name,
// amount, type and date are the same facts already shown one-by-one on the
// admin side, just aggregated for public display).
export const listPublicDonors = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ where: { slug: req.params.slug, status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" } });
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    const { q, page = 1, pageSize = 10 } = req.query;
    const where = { campaignId: campaign.id, status: "recorded" };
    if (q) where.donorName = { [Op.like]: `%${q}%` };

    const limit = Math.min(Number(pageSize) || 10, 50);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await Donation.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });
    const donors = rows.map((d) => ({
      id: d.id,
      donorName: d.donorName || "Anonymous",
      amount: Number(d.amount),
      donationType: d.donationType,
      createdAt: d.createdAt,
    }));

    res.json({ donors, total: count, page: Number(page) || 1, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// The public Donate flow's "I've Sent It" step — records the donor's own
// claim (not a confirmed transfer) so the masjid/admin actually finds out
// it happened, instead of relying on the donor separately messaging them.
// Always status:"pending" and recordedBy:null — never counted toward the
// public raised total (amountRaised()/donorCount only sum status:"recorded")
// until an admin reviews it via confirmDonation/declineDonation. Requires
// sign-in (route-level auth/requireUser) so every claim is tied to a real,
// accountable account (userId) even if the donor chooses to display
// anonymously — prevents an anonymous visitor from spamming fake claims.
export const submitDonationClaim = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ where: { slug: req.params.slug, status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" } });
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    const { donorName, donorEmail, amount, method } = req.body;
    if (!(Number(amount) > 0)) return res.status(400).json({ message: "Enter a donation amount greater than zero." });

    const donation = await Donation.create({
      campaignId: campaign.id,
      userId: req.user.id,
      donorName: donorName?.trim() || null,
      donorEmail: donorEmail?.trim() || null,
      amount,
      method: ["bank_transfer", "upi", "cash", "cheque", "other"].includes(method) ? method : "upi",
      donationType: campaign.donationType,
      status: "pending",
      recordedBy: null,
    });

    await notifyAdmins({
      type: "donation_claim",
      title: "New donation claim to review",
      body: `${donorName?.trim() || "A donor"} claims to have sent ₹${Number(amount).toLocaleString("en-IN")} to "${campaign.title}". Confirm once verified so it counts toward the campaign's total.`,
      link: `/admin/campaigns/${campaign.id}`,
      relatedMasjidId: campaign.masjidId,
    });

    res.status(201).json({ donation: { id: donation.id, status: donation.status } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listByMasjid = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      where: { masjidId: req.params.masjidId, status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" },
      order: [["approvedAt", "DESC"]],
    });
    res.json({ campaigns: await Promise.all(campaigns.map(withCard)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listCategories = async (req, res) => {
  try {
    const categories = await CampaignCategory.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name"] });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listClassifications = async (req, res) => {
  try {
    const classifications = await CampaignClassification.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name"] });
    res.json({ classifications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
