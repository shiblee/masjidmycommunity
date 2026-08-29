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
import { amountRaised } from "./campaignController.js";

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

    const [photos, budgetItems, updates, masjid, raised, category] = await Promise.all([
      CampaignPhoto.findAll({ where: { campaignId: campaign.id }, order: [["sortOrder", "ASC"]] }),
      CampaignBudgetItem.findAll({ where: { campaignId: campaign.id }, order: [["sortOrder", "ASC"]] }),
      CampaignUpdate.findAll({ where: { campaignId: campaign.id }, order: [["createdAt", "DESC"]] }),
      Masjid.findByPk(campaign.masjidId, { attributes: ["id", "name", "city", "country", "tagline", "imamName"] }),
      amountRaised(campaign.id),
      campaign.categoryId ? CampaignCategory.findByPk(campaign.categoryId, { attributes: ["id", "name"] }) : null,
    ]);

    const donationAccount = await MasjidDonationAccount.findOne({ where: { masjidId: campaign.masjidId, verified: true } });
    const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;

    res.json({
      campaign: {
        ...campaign.toJSON(),
        amountRaised: raised,
        progressPercent: goal ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : null,
      },
      photos,
      budgetItems,
      updates,
      masjid,
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
