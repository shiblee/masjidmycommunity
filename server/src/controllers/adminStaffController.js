import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import AdminUser from "../models/AdminUser.js";
import AdminActivityLog from "../models/AdminActivityLog.js";
import PermissionChangeLog from "../models/PermissionChangeLog.js";
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

    const [totalLogins, lastLoginRow, firstActivity, totalActivity, moduleUsage] = await Promise.all([
      AdminActivityLog.count({ where: { adminUserId: admin.id, activityType: "login", status: "success" } }),
      AdminActivityLog.findOne({ where: { adminUserId: admin.id, activityType: "login", status: "success" }, order: [["createdAt", "DESC"]] }),
      AdminActivityLog.findOne({ where: { adminUserId: admin.id, activityType: "login", status: "success" }, order: [["createdAt", "ASC"]] }),
      AdminActivityLog.count({ where: { adminUserId: admin.id, activityType: { [Op.in]: ["action", "page_view"] } } }),
      AdminActivityLog.findAll({
        where: { adminUserId: admin.id, activityType: { [Op.in]: ["action", "page_view"] }, module: { [Op.ne]: null } },
        attributes: ["module", [AdminActivityLog.sequelize.fn("COUNT", "*"), "c"]],
        group: ["module"],
        order: [[AdminActivityLog.sequelize.literal("c"), "DESC"]],
        raw: true,
      }),
    ]);

    const moduleLabel = (key) => PERMISSION_MODULES.find((m) => m.key === key)?.label || key;

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
        totalActivity,
        mostUsedModule: moduleUsage[0] ? moduleLabel(moduleUsage[0].module) : null,
        moduleUsage: moduleUsage.map((m) => ({ module: moduleLabel(m.module), count: Number(m.c) })),
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
    let permissionsChanged = false;
    const oldPermissions = admin.permissions;
    if (permissions !== undefined) {
      if (!isValidPermissions(permissions)) return res.status(400).json({ message: "Invalid permissions." });
      if (JSON.stringify(permissions) !== JSON.stringify(oldPermissions || {})) permissionsChanged = true;
      admin.permissions = permissions;
      admin.changed("permissions", true);
    }

    await admin.save();

    // Best-effort, same contract as recordAdminActivity -- never break the
    // real save that triggered it.
    if (permissionsChanged) {
      PermissionChangeLog.create({
        staffId: admin.id,
        oldPermissions: oldPermissions || {},
        newPermissions: admin.permissions,
        changedByAdminId: req.user.id,
        changedByAdminName: req.user.name || req.user.email,
      }).catch((error) => console.error("PermissionChangeLog write failed:", error.message));
    }

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

// Searchable/filterable timeline (spec's Activity tab) -- module/action/
// status/date-range filters, same pagination shape as everywhere else.
export const getActivity = async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ where: { id: req.params.id, role: "staff" } });
    if (!admin) return res.status(404).json({ message: "Staff member not found." });

    const { module, action, status, dateFrom, dateTo, page = 1, pageSize = 30 } = req.query;
    const where = { adminUserId: admin.id, activityType: { [Op.in]: ["action", "page_view"] } };
    if (module) where.module = module;
    if (action) where.action = action;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(`${dateTo}T23:59:59.999`);
    }

    const limit = Math.min(Number(pageSize) || 30, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await AdminActivityLog.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });
    res.json({ activity: rows, total: count, page: Number(page) || 1, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPermissionHistory = async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ where: { id: req.params.id, role: "staff" } });
    if (!admin) return res.status(404).json({ message: "Staff member not found." });

    const rows = await PermissionChangeLog.findAll({ where: { staffId: admin.id }, order: [["createdAt", "DESC"]], limit: 50 });
    res.json({ history: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
