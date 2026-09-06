import { Op } from "sequelize";
import CommunityActivity from "../models/CommunityActivity.js";
import User from "../models/User.js";
import Masjid from "../models/Masjid.js";
import { deleteActivityCascade } from "./publicCommunityController.js";

export const listAll = async (req, res) => {
  try {
    const { type, status, masjidId, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (type && type !== "all") where.type = type;
    if (status && status !== "all") where.status = status;
    if (masjidId) where.relatedMasjidId = masjidId;

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await CommunityActivity.findAndCountAll({
      where,
      order: [
        ["isPinned", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit,
      offset,
    });

    const userIds = [...new Set(rows.filter((a) => (a.type === "new_user" || a.type === "community_post") && a.relatedUserId).map((a) => a.relatedUserId))];
    const masjidIds = [...new Set(rows.filter((a) => a.relatedMasjidId).map((a) => a.relatedMasjidId))];
    const [users, masjids] = await Promise.all([
      userIds.length ? User.findAll({ where: { id: { [Op.in]: userIds } } }) : [],
      masjidIds.length ? Masjid.findAll({ where: { id: { [Op.in]: masjidIds } }, attributes: ["id", "name"] }) : [],
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const masjidById = new Map(masjids.map((m) => [m.id, m]));

    // Authorized admin surface — full contact details are fine here, unlike
    // the masked-only public wall feed.
    const activities = rows.map((a) => {
      const json = a.toJSON();
      if (a.type === "new_user" && a.relatedUserId) {
        const u = userById.get(a.relatedUserId);
        json.user = u
          ? {
              id: u.id,
              fullName: u.fullName,
              username: u.username,
              email: u.email,
              mobile: u.mobile,
              status: u.status,
              registeredAt: u.createdAt,
            }
          : null;
      }
      if (a.type === "community_post" && a.relatedUserId) {
        const u = userById.get(a.relatedUserId);
        json.author = u ? { id: u.id, fullName: u.fullName, email: u.email } : null;
      }
      if (a.relatedMasjidId) {
        const m = masjidById.get(a.relatedMasjidId);
        json.masjid = m ? { id: m.id, name: m.name } : null;
      }
      return json;
    });

    res.json({ activities, total: count, page: Number(page) || 1, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function findOr404(req, res) {
  const activity = await CommunityActivity.findByPk(req.params.id);
  if (!activity) {
    res.status(404).json({ message: "Activity not found." });
    return null;
  }
  return activity;
}

export const update = async (req, res) => {
  try {
    const activity = await findOr404(req, res);
    if (!activity) return;
    for (const field of ["title", "body", "imageUrl"]) {
      if (req.body[field] !== undefined) activity[field] = req.body[field];
    }
    await activity.save();
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setStatus = async (req, res, status) => {
  try {
    const activity = await findOr404(req, res);
    if (!activity) return;
    activity.status = status;
    if (status === "published" && !activity.publishedAt) activity.publishedAt = new Date();
    await activity.save();
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const publish = (req, res) => setStatus(req, res, "published");
export const hide = (req, res) => setStatus(req, res, "hidden");

export const setPinned = async (req, res, pinned) => {
  try {
    const activity = await findOr404(req, res);
    if (!activity) return;
    activity.isPinned = pinned;
    await activity.save();
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const pin = (req, res) => setPinned(req, res, true);
export const unpin = (req, res) => setPinned(req, res, false);

export const remove = async (req, res) => {
  try {
    const activity = await findOr404(req, res);
    if (!activity) return;
    // Same full cascade the author's own delete uses — an admin removing a
    // community_post shouldn't leave its comments/votes/reports orphaned.
    await deleteActivityCascade(activity);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
