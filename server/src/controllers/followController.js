import { Op } from "sequelize";
import User from "../models/User.js";
import Follow from "../models/Follow.js";
import { notifyUser } from "../services/notificationService.js";

const SAFE_ATTRIBUTES = ["id", "username", "fullName", "profilePhoto", "bio", "locationLabel", "locationCity", "locationState", "locationCountry"];

async function findActiveUser(id) {
  const user = await User.findOne({ where: { id } });
  if (!user || user.status === "suspended") return null;
  return user;
}

// Same reorder-after-fetch pattern getPublicProfile uses for likedMasjids/
// likedJobs -- Follow rows come back in createdAt order, but a plain
// `User.findAll({ where: { id: [...] } })` doesn't preserve that order.
async function serializeUserList(rows, idField, viewerId) {
  const ids = rows.map((r) => r[idField]);
  if (!ids.length) return [];
  const users = await User.findAll({ where: { id: ids, status: { [Op.ne]: "suspended" } }, attributes: SAFE_ATTRIBUTES });
  const byId = new Map(users.map((u) => [u.id, u]));
  const viewerFollowingIds = viewerId
    ? new Set((await Follow.findAll({ where: { followerId: viewerId, followingId: ids }, attributes: ["followingId"] })).map((f) => f.followingId))
    : new Set();
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((u) => ({ ...u.toJSON(), verified: !!(u.emailVerified || u.mobileVerified), isFollowing: viewerFollowingIds.has(u.id) }));
}

export const followUser = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.user.id) return res.status(400).json({ message: "You can't follow yourself." });

    const target = await findActiveUser(targetId);
    if (!target) return res.status(404).json({ message: "User not found." });

    const [, created] = await Follow.findOrCreate({ where: { followerId: req.user.id, followingId: targetId } });
    if (created) {
      const follower = await User.findByPk(req.user.id, { attributes: ["username", "fullName"] });
      notifyUser({
        userId: targetId,
        type: "new_follower",
        title: "New follower",
        body: `${follower?.fullName || "Someone"} started following you.`,
        link: follower ? `/profile/${follower.username}` : undefined,
      });
    }
    res.json({ following: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    await Follow.destroy({ where: { followerId: req.user.id, followingId: req.params.id } });
    res.json({ following: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listFollowers = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const target = await findActiveUser(targetId);
    if (!target) return res.status(404).json({ message: "User not found." });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.pageSize) || 20, 60);
    const viewerId = req.user?.type === "user" ? req.user.id : null;

    const { rows, count } = await Follow.findAndCountAll({
      where: { followingId: targetId },
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });
    const users = await serializeUserList(rows, "followerId", viewerId);
    res.json({ users, total: count, page, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listFollowing = async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const target = await findActiveUser(targetId);
    if (!target) return res.status(404).json({ message: "User not found." });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.pageSize) || 20, 60);
    const viewerId = req.user?.type === "user" ? req.user.id : null;

    const { rows, count } = await Follow.findAndCountAll({
      where: { followerId: targetId },
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });
    const users = await serializeUserList(rows, "followingId", viewerId);
    res.json({ users, total: count, page, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
