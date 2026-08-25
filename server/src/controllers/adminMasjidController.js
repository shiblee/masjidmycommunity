import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidDonationAccount from "../models/MasjidDonationAccount.js";
import MasjidHistory from "../models/MasjidHistory.js";
import { recordMasjidApprovedActivity } from "../services/communityActivityService.js";

async function logHistory(masjidId, action, note, actorName) {
  await MasjidHistory.create({ masjidId, action, actorType: "admin", actorName: actorName || "Admin", note: note || null });
}

function maskAccountNumber(digits) {
  if (!digits) return digits;
  return digits.length <= 4 ? digits : `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export const listAll = async (req, res) => {
  try {
    const { status, q, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (q) where[Op.or] = [{ name: { [Op.like]: `%${q}%` } }, { city: { [Op.like]: `%${q}%` } }, { country: { [Op.like]: `%${q}%` } }];

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await Masjid.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });
    const masjids = await Promise.all(
      rows.map(async (m) => {
        const cover = await MasjidPhoto.findOne({ where: { masjidId: m.id, isCover: true } });
        return { ...m.toJSON(), otpCode: undefined, coverPhotoUrl: cover?.url || null };
      })
    );

    const counts = {};
    for (const s of ["draft", "submitted", "under_review", "changes_requested", "approved", "rejected", "inactive"]) {
      counts[s] = await Masjid.count({ where: { status: s } });
    }

    res.json({ masjids, total: count, page: Number(page) || 1, pageSize: limit, counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const [photos, donationAccount, history] = await Promise.all([
      MasjidPhoto.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] }),
      MasjidDonationAccount.findOne({ where: { masjidId: masjid.id } }),
      MasjidHistory.findAll({ where: { masjidId: masjid.id }, order: [["createdAt", "DESC"]] }),
    ]);

    res.json({
      masjid: { ...masjid.toJSON(), otpCode: undefined },
      photos,
      donationAccount: donationAccount?.toJSON() || null,
      history,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approve = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });
    if (!["submitted", "under_review", "changes_requested"].includes(masjid.status)) {
      return res.status(400).json({ message: "Only masjids under review can be approved." });
    }

    masjid.status = "approved";
    masjid.adminFeedback = null;
    masjid.reviewedAt = new Date();
    masjid.approvedAt = new Date();
    await masjid.save();
    await logHistory(masjid.id, "approved", req.body.note, req.user.email);

    const cover = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } });
    await recordMasjidApprovedActivity(masjid, cover?.url || null);

    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reject = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "A rejection reason is required." });

    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    masjid.status = "rejected";
    masjid.adminFeedback = reason.trim();
    masjid.reviewedAt = new Date();
    await masjid.save();
    await logHistory(masjid.id, "rejected", reason.trim(), req.user.email);

    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestChanges = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: "Describe what needs to change." });

    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    masjid.status = "changes_requested";
    masjid.adminFeedback = note.trim();
    masjid.reviewedAt = new Date();
    await masjid.save();
    await logHistory(masjid.id, "changes_requested", note.trim(), req.user.email);

    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: "Note can't be empty." });
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    await logHistory(masjid.id, "note", note.trim(), req.user.email);
    const history = await MasjidHistory.findAll({ where: { masjidId: masjid.id }, order: [["createdAt", "DESC"]] });
    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setActive = async (req, res, active) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    if (active) {
      if (masjid.status !== "inactive") return res.status(400).json({ message: "Only inactive masjids can be reactivated." });
      masjid.status = "approved";
      await logHistory(masjid.id, "activated", null, req.user.email);
    } else {
      if (masjid.status !== "approved") return res.status(400).json({ message: "Only approved masjids can be deactivated." });
      masjid.status = "inactive";
      await logHistory(masjid.id, "deactivated", null, req.user.email);
    }
    await masjid.save();
    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const activate = (req, res) => setActive(req, res, true);
export const deactivate = (req, res) => setActive(req, res, false);

export const verifyDonationAccount = async (req, res) => {
  try {
    const account = await MasjidDonationAccount.findOne({ where: { masjidId: req.params.id } });
    if (!account) return res.status(404).json({ message: "No donation account on file for this masjid." });
    account.verified = true;
    await account.save();
    await logHistory(req.params.id, "donation_account_verified", null, req.user.email);
    const json = account.toJSON();
    json.accountNumberMasked = maskAccountNumber(json.accountNumber);
    res.json({ donationAccount: json });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
