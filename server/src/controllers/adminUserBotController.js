import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import UserBotSettings from "../models/UserBotSettings.js";
import User from "../models/User.js";
import Education from "../models/Education.js";
import WorkExperience from "../models/WorkExperience.js";
import UserSkill from "../models/UserSkill.js";
import UserHobby from "../models/UserHobby.js";
import { generateSyntheticUser } from "../services/syntheticUserGeneratorService.js";
import { getUserBotSchedulerState } from "../services/userBotSchedulerService.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";

const SETTINGS_FIELDS = [
  "enabled", "usersPerHour", "indiaPercent", "muslimPersonaPercent",
  "activeHourStart", "activeHourEnd", "maxBotUsersPerDay", "maxTotalBotUsers",
];

export const getSettings = async (req, res) => {
  try {
    const settings = await UserBotSettings.findByPk(1);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await UserBotSettings.findByPk(1);
    const actor = await metaActorFrom(req);
    const fields = [];
    for (const field of SETTINGS_FIELDS) {
      if (req.body[field] === undefined) continue;
      const oldValue = settings[field];
      settings[field] = req.body[field];
      fields.push({ field, oldValue, newValue: req.body[field] });
    }
    await settings.save();
    await recordMetaChange({ entityType: "UserBotSettings", entityId: 1, entityName: "User Bot Settings", action: "update", actor, fields }).catch(() => {});
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const testRunBot = async (req, res) => {
  try {
    const settings = await UserBotSettings.findByPk(1);
    const user = await generateSyntheticUser(settings);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStatus = async (req, res) => {
  try {
    const settings = await UserBotSettings.findByPk(1);
    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0));
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    const [generatedThisHour, generatedToday, generatedThisMonth, totalBotUsers, activeBotUsers, indiaBotUsers] = await Promise.all([
      User.count({ where: { userType: "bot", createdAt: { [Op.gte]: hourStart } } }),
      User.count({ where: { userType: "bot", createdAt: { [Op.gte]: dayStart } } }),
      User.count({ where: { userType: "bot", createdAt: { [Op.gte]: monthStart } } }),
      User.count({ where: { userType: "bot" } }),
      User.count({ where: { userType: "bot", status: "active" } }),
      User.count({ where: { userType: "bot", locationCountry: "India" } }),
    ]);

    const remainingQuota = Math.max(settings.usersPerHour - generatedThisHour, 0);
    const remainingMinutes = Math.max(60 - now.getUTCMinutes(), 1);
    const state = getUserBotSchedulerState();

    res.json({
      enabled: settings.enabled,
      usersPerHour: settings.usersPerHour,
      generatedThisHour,
      generatedToday,
      generatedThisMonth,
      totalBotUsers,
      activeBotUsers,
      indiaBotUsers,
      internationalBotUsers: totalBotUsers - indiaBotUsers,
      estimatedNextGeneration: settings.enabled && remainingQuota > 0 ? new Date(now.getTime() + (remainingMinutes / remainingQuota) * 60000) : null,
      schedulerStatus: settings.enabled ? "running" : "stopped",
      lastGenerated: state.lastGenerated,
      lastError: state.lastError,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listBotUsers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(Number(req.query.pageSize) || 50, 200);
    const where = { userType: "bot" };
    if (req.query.status && req.query.status !== "all") where.status = req.query.status;
    if (req.query.q) {
      const like = { [Op.like]: `%${req.query.q.trim()}%` };
      where[Op.or] = [{ fullName: like }, { username: like }, { email: like }];
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: ["id", "fullName", "username", "email", "status", "locationCity", "locationCountry", "profilePhoto", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    res.json({ rows, total: count, page, pageSize });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Deletes only trafficType-equivalent userType:"bot" rows — never a real
// user — in FK-safe child-to-parent order, plus their generated avatar
// files on disk.
export const resetBotData = async (req, res) => {
  try {
    const botUsers = await User.findAll({ where: { userType: "bot" }, attributes: ["id", "profilePhoto"] });
    const ids = botUsers.map((u) => u.id);
    if (ids.length) {
      await UserSkill.destroy({ where: { userId: ids } });
      await UserHobby.destroy({ where: { userId: ids } });
      await WorkExperience.destroy({ where: { userId: ids } });
      await Education.destroy({ where: { userId: ids } });
      await User.destroy({ where: { id: ids } });
      for (const u of botUsers) {
        if (!u.profilePhoto?.startsWith("/uploads/profile-photos/")) continue;
        const filePath = path.resolve(u.profilePhoto.replace(/^\//, ""));
        fs.unlink(filePath, () => {});
      }
    }
    res.json({ deletedUsers: ids.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
