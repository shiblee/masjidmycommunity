import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js";

const REMEMBER_EXPIRY = "30d";
const SESSION_EXPIRY = "12h";

const DEFAULT_PREFERENCES = {
  notifications: {
    newDonations: true,
    verificationRequests: true,
    campaignMilestones: true,
    weeklyDigest: false,
    productUpdates: false,
  },
  platform: {
    currency: "INR",
    timezone: "ist",
    dateFormat: "mdy",
    verificationSla: "5",
  },
};

function toPublicUser(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    phone: admin.phone,
    bio: admin.bio,
    avatarUrl: admin.avatarUrl,
    twoFactorEnabled: admin.twoFactorEnabled,
    loginAlerts: admin.loginAlerts,
    preferences: admin.preferences || DEFAULT_PREFERENCES,
  };
}

export const login = async (req, res) => {
  try {
    const { email, password, remember } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const admin = await AdminUser.findOne({ where: { email: String(email).trim().toLowerCase() } });
    const invalidMessage = "Invalid email or password. Please try again.";

    if (!admin) {
      return res.status(401).json({ message: invalidMessage });
    }

    const matches = await bcrypt.compare(password, admin.password);
    if (!matches) {
      return res.status(401).json({ message: invalidMessage });
    }

    if (admin.status !== "active") {
      return res.status(403).json({ message: "This admin account is not active. Contact a platform administrator." });
    }

    const expiresIn = remember ? REMEMBER_EXPIRY : SESSION_EXPIRY;
    const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role, type: "admin" }, process.env.JWT_SECRET, {
      expiresIn,
    });

    admin.lastLoginAt = new Date();
    await admin.save();

    res.json({ token, expiresIn, user: toPublicUser(admin) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const me = async (req, res) => {
  try {
    const admin = await AdminUser.findByPk(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin account not found." });
    res.json({ user: toPublicUser(admin) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const admin = await AdminUser.findByPk(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin account not found." });

    const { name, email, phone, bio } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Full name is required." });
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== admin.email) {
      const clash = await AdminUser.findOne({ where: { email: normalizedEmail } });
      if (clash) return res.status(409).json({ message: "That email is already in use by another admin account." });
    }

    admin.name = name.trim();
    admin.email = normalizedEmail;
    admin.phone = phone?.trim() || null;
    admin.bio = bio?.trim() || null;
    await admin.save();

    res.json({ user: toPublicUser(admin) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const AVATAR_DATA_URI = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const MAX_AVATAR_CHARS = 2_800_000; // ~2MB image after base64 encoding

export const updateAvatar = async (req, res) => {
  try {
    const admin = await AdminUser.findByPk(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin account not found." });

    const { avatarUrl } = req.body;

    if (avatarUrl === null) {
      admin.avatarUrl = null;
      await admin.save();
      return res.json({ user: toPublicUser(admin) });
    }

    if (typeof avatarUrl !== "string" || !AVATAR_DATA_URI.test(avatarUrl)) {
      return res.status(400).json({ message: "Please upload a valid JPG, PNG, WEBP, or GIF image." });
    }
    if (avatarUrl.length > MAX_AVATAR_CHARS) {
      return res.status(400).json({ message: "Image is too large. Please choose a file under 2MB." });
    }

    admin.avatarUrl = avatarUrl;
    await admin.save();
    res.json({ user: toPublicUser(admin) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const admin = await AdminUser.findByPk(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin account not found." });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const matches = await bcrypt.compare(currentPassword, admin.password);
    if (!matches) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const admin = await AdminUser.findByPk(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin account not found." });

    const { twoFactorEnabled, loginAlerts, notifications, platform } = req.body;
    const current = admin.preferences || DEFAULT_PREFERENCES;

    if (typeof twoFactorEnabled === "boolean") admin.twoFactorEnabled = twoFactorEnabled;
    if (typeof loginAlerts === "boolean") admin.loginAlerts = loginAlerts;

    if (notifications && typeof notifications === "object") {
      admin.preferences = { ...current, notifications: { ...DEFAULT_PREFERENCES.notifications, ...current.notifications, ...notifications } };
    }
    if (platform && typeof platform === "object") {
      admin.preferences = { ...(admin.preferences || current), platform: { ...DEFAULT_PREFERENCES.platform, ...current.platform, ...platform } };
    }

    admin.changed("preferences", true);
    await admin.save();

    res.json({ user: toPublicUser(admin) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
