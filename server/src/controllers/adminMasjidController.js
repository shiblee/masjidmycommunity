import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidDonationAccount from "../models/MasjidDonationAccount.js";
import MasjidHistory from "../models/MasjidHistory.js";
import User from "../models/User.js";
import { recordMasjidApprovedActivity } from "../services/communityActivityService.js";
import { sendMasjidChangesRequestedEmail } from "../services/emailService.js";
import { notifyUser } from "../services/notificationService.js";

async function logHistory(masjidId, action, note, actorName) {
  await MasjidHistory.create({ masjidId, action, actorType: "admin", actorName: actorName || "Admin", note: note || null });
}

function maskAccountNumber(digits) {
  if (!digits) return digits;
  return digits.length <= 4 ? digits : `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

const DB_SORT_COLUMNS = {
  name: "name",
  location: "city",
  createdAt: "createdAt",
  status: "status",
};

const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  rejected: "Rejected",
  inactive: "Inactive",
  deleted: "Deleted",
};

export const listAll = async (req, res) => {
  try {
    const { status, q, page = 1, pageSize = 20, sortBy = "createdAt", sortDir = "desc" } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;

    if (q) {
      const term = q.trim();
      const like = { [Op.like]: `%${term}%` };
      const matchingOwners = await User.findAll({
        where: { [Op.or]: [{ fullName: like }, { email: like }, { mobile: like }] },
        attributes: ["id"],
      });
      const matchingStatuses = Object.entries(STATUS_LABELS)
        .filter(([key, label]) => key.includes(term.toLowerCase()) || label.toLowerCase().includes(term.toLowerCase()))
        .map(([key]) => key);

      where[Op.or] = [
        { name: like },
        { tagline: like },
        { address: like },
        { area: like },
        { city: like },
        { district: like },
        { state: like },
        { country: like },
        { postalCode: like },
        { imamName: like },
        { contactMobile: like },
        { contactEmail: like },
        ...(matchingOwners.length ? [{ userId: { [Op.in]: matchingOwners.map((u) => u.id) } }] : []),
        ...(matchingStatuses.length ? [{ status: { [Op.in]: matchingStatuses } }] : []),
      ];
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const page1 = Math.max(Number(page) || 1, 1);
    const offset = (page1 - 1) * limit;
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    // "Registered By" isn't a column on Masjid — it's pulled from the User
    // table, so it can't be sorted by the DB alongside the rest. Fetch every
    // matching row, sort by owner name in JS, then paginate manually.
    let rows, count;
    if (sortBy === "ownerName") {
      const all = await Masjid.findAll({ where, order: [["createdAt", "DESC"]] });
      const ownerIds = [...new Set(all.map((m) => m.userId))];
      const owners = await User.findAll({ where: { id: ownerIds }, attributes: ["id", "fullName"] });
      const nameById = Object.fromEntries(owners.map((u) => [u.id, u.fullName || ""]));
      all.sort((a, b) => {
        const av = nameById[a.userId] || "";
        const bv = nameById[b.userId] || "";
        const cmp = av.localeCompare(bv);
        return dir === "ASC" ? cmp : -cmp;
      });
      count = all.length;
      rows = all.slice(offset, offset + limit);
    } else {
      const column = DB_SORT_COLUMNS[sortBy] || "createdAt";
      ({ rows, count } = await Masjid.findAndCountAll({ where, order: [[column, dir]], limit, offset }));
    }

    const ownerIds = [...new Set(rows.map((m) => m.userId))];
    const owners = await User.findAll({ where: { id: ownerIds }, attributes: ["id", "fullName", "email", "mobile"] });
    const ownerById = Object.fromEntries(owners.map((u) => [u.id, u]));

    const masjids = await Promise.all(
      rows.map(async (m) => {
        const cover = await MasjidPhoto.findOne({ where: { masjidId: m.id, isCover: true } });
        const owner = ownerById[m.userId];
        return {
          ...m.toJSON(),
          otpCode: undefined,
          coverPhotoUrl: cover?.url || null,
          ownerName: owner?.fullName || null,
          ownerEmail: owner?.email || null,
          ownerMobile: owner?.mobile || null,
        };
      })
    );

    const counts = {};
    for (const s of ["draft", "submitted", "under_review", "changes_requested", "approved", "rejected", "inactive", "deleted"]) {
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

    const owner = await User.findByPk(masjid.userId);
    if (owner) {
      sendMasjidChangesRequestedEmail(masjid, owner).catch(() => {});
      notifyUser({
        userId: owner.id,
        type: "masjid_changes_requested",
        title: "Admin requested changes to your masjid",
        body: `Changes have been requested for "${masjid.name}": ${note.trim()}`,
        link: `/account/my-masjids/${masjid.id}`,
        relatedMasjidId: masjid.id,
      }).catch(() => {});
    }

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
