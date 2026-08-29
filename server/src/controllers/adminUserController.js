import { Op } from "sequelize";
import User from "../models/User.js";
import UserActivityLog from "../models/UserActivityLog.js";
import { sendAccountStatusEmail } from "../services/emailService.js";

const ACTIVITY_PAGE_SIZE = 10;

function toAdminUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    registrationMethod: user.registrationMethod,
    emailVerified: user.emailVerified,
    mobileVerified: user.mobileVerified,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export const listUsers = async (req, res) => {
  try {
    const { q, status } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      where[Op.or] = [
        { fullName: { [Op.like]: term } },
        { username: { [Op.like]: term } },
        { email: { [Op.like]: term } },
        { mobile: { [Op.like]: term } },
      ];
    }

    const users = await User.findAll({ where, order: [["createdAt", "DESC"]] });
    res.json({ users: users.map(toAdminUser) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const { type, from, to, ip, sort, sortBy } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);

    const where = { userId: id };
    if (type === "login" || type === "logout") where.activityType = type;
    if (ip?.trim()) where.ipAddress = { [Op.like]: `%${ip.trim()}%` };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(`${from}T00:00:00`);
      if (to) where.createdAt[Op.lte] = new Date(`${to}T23:59:59`);
    }

    // Allow-list only — sortBy is client-controlled, never interpolate an
    // arbitrary column name into the query.
    const SORTABLE_COLUMNS = new Set(["createdAt", "activityType", "status", "ipAddress", "deviceType", "browser", "os", "location", "sessionDurationSeconds"]);
    const sortColumn = SORTABLE_COLUMNS.has(sortBy) ? sortBy : "createdAt";

    const { rows, count } = await UserActivityLog.findAndCountAll({
      where,
      order: [[sortColumn, sort === "oldest" ? "ASC" : "DESC"]],
      limit: ACTIVITY_PAGE_SIZE,
      offset: (page - 1) * ACTIVITY_PAGE_SIZE,
    });

    res.json({
      user: toAdminUser(user),
      activities: rows,
      total: count,
      page,
      totalPages: Math.max(1, Math.ceil(count / ACTIVITY_PAGE_SIZE)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.status === "pending_verification") {
      return res.status(400).json({ message: "This account has not completed verification yet." });
    }

    const statusChanged = user.status !== status;
    user.status = status;
    await user.save();
    if (statusChanged) sendAccountStatusEmail(user, status).catch(() => {});
    res.json({ user: toAdminUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
