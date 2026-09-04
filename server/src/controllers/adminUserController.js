import { Op, fn, col } from "sequelize";
import User from "../models/User.js";
import UserActivityLog from "../models/UserActivityLog.js";
import UserSession from "../models/UserSession.js";
import ProfileChangeLog from "../models/ProfileChangeLog.js";
import AdminUser from "../models/AdminUser.js";
import Masjid from "../models/Masjid.js";
import Campaign from "../models/Campaign.js";
import WorkExperience from "../models/WorkExperience.js";
import Education from "../models/Education.js";
import UserHobby from "../models/UserHobby.js";
import UserSkill from "../models/UserSkill.js";
import { sendAccountStatusEmail, sendEmailChangedEmail } from "../services/emailService.js";
import { recordProfileChange } from "../utils/profileChangeLog.js";
import { getRequestContext } from "../utils/requestContext.js";
import { isValidMaritalStatusValue } from "../utils/maritalStatus.js";

const ACTIVITY_PAGE_SIZE = 10;
const CHANGE_LOG_PAGE_SIZE = 20;

// Mirrors the public-facing ProfileCompletion.jsx's own CHECKS list exactly
// (photo / personal details / work experience / education / hobbies /
// skills) so an admin sees the same percentage the member sees on their own
// profile — never a second, diverging definition of "complete."
const COMPLETION_CHECKS = [
  (user) => !!user.profilePhoto,
  (user) => !!(user.gender || user.maritalStatus || user.dateOfBirth || user.locationLabel),
  (user, counts) => counts.workExperience > 0,
  (user, counts) => counts.education > 0,
  (user, counts) => counts.hobbies > 0,
  (user, counts) => counts.skills > 0,
];

function computeProfileCompletion(user, counts) {
  const done = COMPLETION_CHECKS.filter((test) => test(user, counts)).length;
  return Math.round((done / COMPLETION_CHECKS.length) * 100);
}

// Batched — one GROUP BY per sub-resource table regardless of how many user
// ids are passed in, so the Users list page doesn't pay N extra queries per
// row just to show each member's completion percentage.
async function getCompletionCountsByUserIds(userIds) {
  const counts = Object.fromEntries(userIds.map((id) => [id, { workExperience: 0, education: 0, hobbies: 0, skills: 0 }]));
  if (!userIds.length) return counts;

  const groupedCount = (Model) => Model.findAll({
    attributes: ["userId", [fn("COUNT", col("id")), "count"]],
    where: { userId: { [Op.in]: userIds } },
    group: ["userId"],
    raw: true,
  });

  const [we, ed, ho, sk] = await Promise.all([
    groupedCount(WorkExperience),
    groupedCount(Education),
    groupedCount(UserHobby),
    groupedCount(UserSkill),
  ]);
  for (const r of we) counts[r.userId].workExperience = Number(r.count);
  for (const r of ed) counts[r.userId].education = Number(r.count);
  for (const r of ho) counts[r.userId].hobbies = Number(r.count);
  for (const r of sk) counts[r.userId].skills = Number(r.count);
  return counts;
}

export function toAdminUser(user, isOnline = false, completionCounts = null) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    bio: user.bio,
    profilePhoto: user.profilePhoto,
    registrationMethod: user.registrationMethod,
    emailVerified: user.emailVerified,
    mobileVerified: user.mobileVerified,
    gender: user.gender,
    maritalStatus: user.maritalStatus,
    dateOfBirth: user.dateOfBirth,
    locationLabel: user.locationLabel,
    locationCity: user.locationCity,
    locationState: user.locationState,
    locationCountry: user.locationCountry,
    status: user.status,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    // "Online" = at least one non-revoked, unexpired refresh session — i.e.
    // a device that can still silently mint a fresh access token without
    // re-authenticating. Not a real-time presence signal (no heartbeat/
    // websocket), just "currently has a valid, unlogged-out session."
    isOnline,
    // Only present when the caller computed it (listUsers/getUser) — omitted
    // entirely otherwise, rather than set to a stale/undefined 0%, so a
    // `{...prev, ...data.user}` merge elsewhere never clobbers a good value.
    ...(completionCounts ? { profileCompletion: computeProfileCompletion(user, completionCounts) } : {}),
  };
}

// Batched — avoids one query per row when listing many users at once.
async function getOnlineUserIds(userIds) {
  if (!userIds.length) return new Set();
  const rows = await UserSession.findAll({
    where: { userId: { [Op.in]: userIds }, revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
    attributes: ["userId"],
    group: ["userId"],
  });
  return new Set(rows.map((r) => r.userId));
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MOBILE_RE = /^[0-9]{10}$/;
const PROFILE_CHANGE_FIELDS = ["fullName", "email", "mobile", "bio", "gender", "maritalStatus", "dateOfBirth", "locationLabel"];

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
    const userIds = users.map((u) => u.id);
    const [onlineIds, completionCounts] = await Promise.all([getOnlineUserIds(userIds), getCompletionCountsByUserIds(userIds)]);
    res.json({ users: users.map((u) => toAdminUser(u, onlineIds.has(u.id), completionCounts[u.id])) });
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

export const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const [masjids, campaigns, onlineIds, completionCounts] = await Promise.all([
      Masjid.findAll({ where: { userId: user.id, status: { [Op.ne]: "deleted" } }, attributes: ["id", "name", "status"], order: [["createdAt", "DESC"]] }),
      Campaign.findAll({ where: { createdBy: user.id }, attributes: ["id", "title", "slug", "status"], order: [["createdAt", "DESC"]] }),
      getOnlineUserIds([user.id]),
      getCompletionCountsByUserIds([user.id]),
    ]);

    res.json({ user: toAdminUser(user, onlineIds.has(user.id), completionCounts[user.id]), masjids, campaigns });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const before = Object.fromEntries(PROFILE_CHANGE_FIELDS.map((f) => [f, user[f]]));

    if (req.body.fullName !== undefined) {
      if (!req.body.fullName.trim()) return res.status(400).json({ message: "Full name is required." });
      user.fullName = req.body.fullName.trim();
    }
    if (req.body.bio !== undefined) {
      user.bio = req.body.bio?.trim() || null;
    }
    if (req.body.email !== undefined) {
      const nextEmail = req.body.email.trim().toLowerCase();
      if (nextEmail && !EMAIL_RE.test(nextEmail)) return res.status(400).json({ message: "Enter a valid email address." });
      if (nextEmail && nextEmail !== user.email) {
        const existing = await User.findOne({ where: { email: nextEmail } });
        if (existing) return res.status(409).json({ message: "That email is already in use by another account." });
        user.email = nextEmail;
        // Admin edits skip the self-service OTP flow (an admin is already a
        // privileged actor) — but the contact detail did change, so the
        // verified flag must reset the same way updateProfile's own
        // self-service path does, to keep verification state trustworthy.
        user.emailVerified = false;
      }
    }
    if (req.body.mobile !== undefined) {
      const nextMobile = req.body.mobile.trim();
      if (nextMobile && !MOBILE_RE.test(nextMobile)) return res.status(400).json({ message: "Enter a valid 10-digit mobile number." });
      if (nextMobile && nextMobile !== user.mobile) {
        const existing = await User.findOne({ where: { mobile: nextMobile } });
        if (existing) return res.status(409).json({ message: "That mobile number is already in use by another account." });
        user.mobile = nextMobile;
        user.mobileVerified = false;
      }
    }
    const GENDERS = new Set(["male", "female", "other", "prefer_not_to_say"]);
    if (req.body.gender !== undefined) {
      if (req.body.gender && !GENDERS.has(req.body.gender)) return res.status(400).json({ message: "Enter a valid gender." });
      user.gender = req.body.gender || null;
    }
    if (req.body.maritalStatus !== undefined) {
      if (req.body.maritalStatus && !(await isValidMaritalStatusValue(req.body.maritalStatus))) return res.status(400).json({ message: "Enter a valid marital status." });
      user.maritalStatus = req.body.maritalStatus || null;
    }
    if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth || null;
    if (req.body.location !== undefined) {
      const loc = req.body.location || {};
      user.locationLabel = loc.label || null;
      user.locationCity = loc.city || null;
      user.locationState = loc.state || null;
      user.locationCountry = loc.country || null;
      user.locationLat = loc.lat ?? null;
      user.locationLng = loc.lng ?? null;
    }

    await user.save();

    const admin = await AdminUser.findByPk(req.user.id, { attributes: ["name"] });
    const fields = PROFILE_CHANGE_FIELDS.filter((f) => String(before[f] ?? "") !== String(user[f] ?? "")).map((f) => ({
      field: f,
      oldValue: before[f],
      newValue: user[f],
    }));
    if (fields.length) {
      recordProfileChange({
        userId: user.id,
        section: "personal",
        action: "update",
        actor: { type: "admin", id: req.user.id, name: admin?.name || null },
        fields,
      }).catch(() => {});
    }

    if (before.email && before.email !== user.email) {
      sendEmailChangedEmail(user, { oldEmail: before.email, newEmail: user.email, ipAddress: getRequestContext(req).ipAddress }).catch(() => {});
    }

    res.json({ user: toAdminUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfileChangeLog = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const { section } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const where = { userId: id };
    if (section) where.section = section;

    const { rows, count } = await ProfileChangeLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: CHANGE_LOG_PAGE_SIZE,
      offset: (page - 1) * CHANGE_LOG_PAGE_SIZE,
    });

    res.json({
      entries: rows,
      total: count,
      page,
      totalPages: Math.max(1, Math.ceil(count / CHANGE_LOG_PAGE_SIZE)),
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
