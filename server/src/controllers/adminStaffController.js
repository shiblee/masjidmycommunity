import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import AdminUser from "../models/AdminUser.js";
import AdminActivityLog from "../models/AdminActivityLog.js";
import { PERMISSION_MODULES, isValidPermissions } from "../config/permissionModules.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const STATUSES = ["active", "inactive", "suspended"];

function assignedModuleLabels(permissions) {
  if (!permissions) return [];
  return PERMISSION_MODULES.filter((m) => (permissions[m.key] || []).length > 0).map((m) => m.label);
}

function toStaffSummary(admin, loginCounts) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    status: admin.status,
    assignedModules: assignedModuleLabels(admin.permissions),
    lastLoginAt: admin.lastLoginAt,
    loginCount: loginCounts?.[admin.id] || 0,
    createdAt: admin.createdAt,
  };
}

// Same pagination/filter shape as adminJobController.js's listAll.
export const listAll = async (req, res) => {
  try {
    const { status, q, page = 1, pageSize = 20, sortBy = "createdAt", sortDir = "desc" } = req.query;
    const where = { role: "staff" };
    if (status && status !== "all") where.status = status;
    if (q) {
      const term = q.trim();
      where[Op.or] = [{ name: { [Op.like]: `%${term}%` } }, { email: { [Op.like]: `%${term}%` } }];
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
    const order = [[["name", "email", "status", "lastLoginAt", "createdAt"].includes(sortBy) ? sortBy : "createdAt", sortDir === "asc" ? "ASC" : "DESC"]];

    const { rows, count } = await AdminUser.findAndCountAll({ where, order, limit, offset });

    const loginCountRows = rows.length
      ? await AdminActivityLog.findAll({
          where: { adminUserId: rows.map((r) => r.id), activityType: "login", status: "success" },
          attributes: ["adminUserId", [AdminActivityLog.sequelize.fn("COUNT", "*"), "c"]],
          group: ["adminUserId"],
          raw: true,
        })
      : [];
    const loginCounts = Object.fromEntries(loginCountRows.map((r) => [r.adminUserId, Number(r.c)]));

    res.json({ staff: rows.map((r) => toStaffSummary(r, loginCounts)), total: count, page: Number(page) || 1, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listPermissionModules = async (req, res) => {
  res.json({ modules: PERMISSION_MODULES });
};

export const getOne = async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ where: { id: req.params.id, role: "staff" } });
    if (!admin) return res.status(404).json({ message: "Staff member not found." });

    const [totalLogins, lastLoginRow, firstActivity] = await Promise.all([
      AdminActivityLog.count({ where: { adminUserId: admin.id, activityType: "login", status: "success" } }),
      AdminActivityLog.findOne({ where: { adminUserId: admin.id, activityType: "login", status: "success" }, order: [["createdAt", "DESC"]] }),
      AdminActivityLog.findOne({ where: { adminUserId: admin.id, activityType: "login", status: "success" }, order: [["createdAt", "ASC"]] }),
    ]);

    res.json({
      staff: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
        permissions: admin.permissions || {},
        createdAt: admin.createdAt,
        lastLoginAt: admin.lastLoginAt,
      },
      overview: {
        totalLogins,
        lastLoginAt: lastLoginRow?.createdAt || null,
        firstLoginAt: firstActivity?.createdAt || null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, permissions } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required." });
    if (!email?.trim() || !EMAIL_RE.test(email.trim())) return res.status(400).json({ message: "Enter a valid email address." });
    if (!password || password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    if (password !== confirmPassword) return res.status(400).json({ message: "Password and confirm password don't match." });

    const normalizedPermissions = permissions && typeof permissions === "object" ? permissions : {};
    if (!isValidPermissions(normalizedPermissions)) return res.status(400).json({ message: "Invalid permissions." });
    if (Object.keys(normalizedPermissions).length === 0 || !Object.values(normalizedPermissions).some((a) => a.length > 0)) {
      return res.status(400).json({ message: "Assign at least one permission, or create the account as inactive if it's intentionally restricted." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await AdminUser.findOne({ where: { email: normalizedEmail } });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await AdminUser.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role: "staff",
      status: "active",
      permissions: normalizedPermissions,
    });

    res.status(201).json({ staff: { id: admin.id, name: admin.name, email: admin.email, status: admin.status, permissions: admin.permissions } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ where: { id: req.params.id, role: "staff" } });
    if (!admin) return res.status(404).json({ message: "Staff member not found." });

    const { name, email, permissions } = req.body;
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "Name is required." });
      admin.name = name.trim();
    }
    if (email !== undefined) {
      if (!EMAIL_RE.test(email.trim())) return res.status(400).json({ message: "Enter a valid email address." });
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== admin.email) {
        const clash = await AdminUser.findOne({ where: { email: normalizedEmail } });
        if (clash) return res.status(409).json({ message: "An account with this email already exists." });
      }
      admin.email = normalizedEmail;
    }
    if (permissions !== undefined) {
      if (!isValidPermissions(permissions)) return res.status(400).json({ message: "Invalid permissions." });
      admin.permissions = permissions;
      admin.changed("permissions", true);
    }

    await admin.save();
    res.json({ staff: { id: admin.id, name: admin.name, email: admin.email, status: admin.status, permissions: admin.permissions } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ where: { id: req.params.id, role: "staff" } });
    if (!admin) return res.status(404).json({ message: "Staff member not found." });

    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

    admin.password = await bcrypt.hash(password, 10);
    await admin.save();
    res.json({ message: "Password reset successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setStatus = async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ where: { id: req.params.id, role: "staff" } });
    if (!admin) return res.status(404).json({ message: "Staff member not found." });

    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status." });

    // Historical AdminActivityLog rows are never touched here -- deactivating
    // an account blocks future logins (adminAuthController.login checks
    // status === "active") without erasing anything it already did.
    admin.status = status;
    await admin.save();
    res.json({ staff: { id: admin.id, status: admin.status } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Same pagination shape as everywhere else; paired login/logout rows so the
// client can render one row per session with a computed duration.
export const getLoginHistory = async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ where: { id: req.params.id, role: "staff" } });
    if (!admin) return res.status(404).json({ message: "Staff member not found." });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.pageSize) || 20, 100);

    const { rows, count } = await AdminActivityLog.findAndCountAll({
      where: { adminUserId: admin.id, activityType: { [Op.in]: ["login", "logout"] } },
      order: [["createdAt", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    res.json({ history: rows, total: count, page, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
