import { Op } from "sequelize";
import Campaign from "../models/Campaign.js";
import CampaignPhoto from "../models/CampaignPhoto.js";
import CampaignBudgetItem from "../models/CampaignBudgetItem.js";
import CampaignCategory from "../models/CampaignCategory.js";
import CampaignClassification from "../models/CampaignClassification.js";
import CampaignUpdate from "../models/CampaignUpdate.js";
import CampaignHistory from "../models/CampaignHistory.js";
import Masjid from "../models/Masjid.js";
import MasjidDonationAccount from "../models/MasjidDonationAccount.js";
import Donation from "../models/Donation.js";
import User from "../models/User.js";
import { getEngagementFor } from "../services/masjidEngagementService.js";
import { amountRaised } from "./campaignController.js";
import { notifyAdmins } from "../services/adminAlertService.js";
import { recordDonationActivity, recordMilestoneActivity } from "../services/communityActivityService.js";

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
// panels — deliberately never returns donorEmail, and masks donorName to
// "Anonymous" whenever isAnonymous is set, regardless of what real name is
// actually stored (donorName/donorEmail/userId stay on the row underneath
// for payment/compliance/accounting/audit — see the Donation model comment
// — this endpoint is the only thing that ever hides them).
export const listPublicDonors = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ where: { slug: req.params.slug, status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" } });
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    const { q, page = 1, pageSize = 10 } = req.query;
    const where = { campaignId: campaign.id, status: "recorded" };
    if (q) {
      // Never let a search match an anonymous donor by their real name —
      // that would leak "this person donated" even though the UI shows
      // "Anonymous". Anonymous rows only surface if the query itself looks
      // like it's searching for "anonymous".
      const matchesAnonymous = "anonymous".includes(q.trim().toLowerCase());
      where[Op.or] = [
        { isAnonymous: false, donorName: { [Op.like]: `%${q}%` } },
        ...(matchesAnonymous ? [{ isAnonymous: true }] : []),
      ];
    }

    const limit = Math.min(Number(pageSize) || 10, 50);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await Donation.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });

    // Real avatars only for non-anonymous donors with an account behind them
    // (admin-recorded rows have no userId) — never fetched/exposed for a
    // donor who chose to display as "Anonymous".
    const photoUserIds = [...new Set(rows.filter((d) => !d.isAnonymous && d.userId).map((d) => d.userId))];
    const users = photoUserIds.length
      ? await User.findAll({ where: { id: photoUserIds }, attributes: ["id", "profilePhoto"] })
      : [];
    const photoByUserId = new Map(users.map((u) => [u.id, u.profilePhoto]));

    const donors = rows.map((d) => ({
      id: d.id,
      donorName: d.isAnonymous ? "Anonymous" : (d.donorName || "Anonymous"),
      donorPhoto: d.isAnonymous ? null : photoByUserId.get(d.userId) || null,
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

    const { donorEmail, amount, method, isAnonymous } = req.body;
    if (!(Number(amount) > 0)) return res.status(400).json({ message: "Enter a donation amount greater than zero." });

    // donorName always comes from the authenticated account, never
    // client-supplied text — now that sign-in is required, this is the one
    // real identity behind every claim. isAnonymous only ever controls
    // whether *public* displays substitute "Anonymous" for it; the real
    // name/account stay on the row for compliance/accounting/audit.
    const account = await User.findByPk(req.user.id, { attributes: ["id", "fullName", "email"] });

    // DEMO MODE — no payment gateway exists yet, so there's no way to
    // actually confirm a transfer happened. Until one is wired up, every
    // claim is auto-recorded (status "recorded") the moment it's submitted
    // instead of sitting "pending" for an admin to confirm, so the donate
    // flow demonstrates end-to-end without a manual admin step in between.
    // adminCampaignController.js's confirmDonation/declineDonation (and the
    // "pending" status itself) are left fully in place — revert this one
    // status value back to "pending" once a real gateway lands.
    const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;
    const beforeRaised = await amountRaised(campaign.id);
    const beforePercent = goal ? Math.min(100, (beforeRaised / goal) * 100) : 0;

    const donation = await Donation.create({
      campaignId: campaign.id,
      userId: req.user.id,
      donorName: account?.fullName || null,
      donorEmail: donorEmail?.trim() || account?.email || null,
      amount,
      method: ["bank_transfer", "upi", "cash", "cheque", "other"].includes(method) ? method : "upi",
      donationType: campaign.donationType,
      status: "recorded",
      recordedBy: null,
      isAnonymous: !!isAnonymous,
    });
    await CampaignHistory.create({
      campaignId: campaign.id,
      action: "donation_confirmed",
      actorType: "user",
      actorName: account?.fullName || "Donor",
      note: `${donation.currency} ${donation.amount} via ${donation.method} (auto-recorded — no payment gateway yet)`,
    });

    const afterRaised = await amountRaised(campaign.id);
    const afterPercent = goal ? Math.min(100, (afterRaised / goal) * 100) : 0;

    if (campaign.status === "active" && goal && afterRaised >= goal) {
      campaign.status = "goal_reached";
      await campaign.save();
    }

    await recordDonationActivity(campaign, donation);
    if (goal) await recordMilestoneActivity(campaign, beforePercent, afterPercent);

    await notifyAdmins({
      type: "donation_claim",
      title: "New donation recorded",
      body: `${account?.fullName || "A donor"} donated ₹${Number(amount).toLocaleString("en-IN")} to "${campaign.title}"${isAnonymous ? " (shown as Anonymous)" : ""}. Auto-recorded — no payment gateway is connected yet, so this wasn't independently verified.`,
      link: `/admin/campaigns/${campaign.id}`,
      relatedMasjidId: campaign.masjidId,
    });

    res.status(201).json({ donation: { id: donation.id, status: donation.status }, amountRaised: afterRaised });
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
