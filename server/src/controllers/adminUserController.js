import { Op } from "sequelize";
import User from "../models/User.js";

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

    user.status = status;
    await user.save();
    res.json({ user: toAdminUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
