import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import User from "../models/User.js";
import AuthSettings from "../models/AuthSettings.js";
import { sendWelcomeEmail, sendOtpEmail } from "../services/emailService.js";
import { recordNewUserActivity } from "../services/communityActivityService.js";
import { recordLoginSuccess, recordLoginFailure, recordLogout } from "../services/userActivityService.js";
import { maskEmail, maskMobile } from "../utils/mask.js";

const SESSION_EXPIRY = "12h";
const REMEMBER_EXPIRY = "30d";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MOBILE_RE = /^[0-9]{10}$/;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskTarget(otpTarget, user) {
  return otpTarget === "email" ? maskEmail(user.email) : maskMobile(user.mobile);
}

async function generateUniqueUsername(fullName) {
  const base = (fullName || "user").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) || "user";
  for (let i = 0; i < 6; i++) {
    const candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await User.findOne({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  return `user${Date.now()}`;
}

function toPublicUser(user) {
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
    profilePhoto: user.profilePhoto,
    gender: user.gender,
    maritalStatus: user.maritalStatus,
    dateOfBirth: user.dateOfBirth,
    locationLabel: user.locationLabel,
    locationCity: user.locationCity,
    locationState: user.locationState,
    locationCountry: user.locationCountry,
    locationLat: user.locationLat,
    locationLng: user.locationLng,
  };
}

function signUserToken(user, remember, sessionId) {
  return jwt.sign({ id: user.id, type: "user", tv: user.tokenVersion, sid: sessionId }, process.env.JWT_SECRET, {
    expiresIn: remember ? REMEMBER_EXPIRY : SESSION_EXPIRY,
  });
}

async function getAuthSettings() {
  const settings = await AuthSettings.findByPk(1);
  return {
    otpExpiryMinutes: settings?.otpExpiryMinutes ?? 5,
    otpResendCooldownSeconds: settings?.otpResendCooldownSeconds ?? 60,
    otpMaxAttempts: settings?.otpMaxAttempts ?? 5,
  };
}

async function issueOtp(user, purpose, otpTarget) {
  const { otpExpiryMinutes } = await getAuthSettings();
  const otp = generateOtp();
  user.otpCode = otp;
  user.otpExpiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);
  user.otpPurpose = purpose;
  user.otpTarget = otpTarget;
  user.otpAttempts = 0;
  await user.save();

  let emailResult = { sent: false, dev: true };
  if (otpTarget === "email") {
    emailResult = await sendOtpEmail(user, otp).catch(() => ({ sent: false, dev: true }));
  }

  return { otp, emailResult };
}

export const getOtpSettings = async (req, res) => {
  try {
    const { otpExpiryMinutes, otpResendCooldownSeconds } = await getAuthSettings();
    res.json({ expiryMinutes: otpExpiryMinutes, resendCooldownSeconds: otpResendCooldownSeconds });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;

    if (!fullName?.trim()) return res.status(400).json({ message: "Full name is required." });
    if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and include a letter and a number." });
    }

    const trimmedEmail = email?.trim().toLowerCase() || null;
    const trimmedMobile = mobile?.trim() || null;

    if (!trimmedEmail && !trimmedMobile) {
      return res.status(400).json({ message: "Please provide an email address or a mobile number." });
    }
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (trimmedMobile && !MOBILE_RE.test(trimmedMobile)) {
      return res.status(400).json({ message: "Enter a valid 10-digit mobile number." });
    }

    const orChecks = [];
    if (trimmedEmail) orChecks.push({ email: trimmedEmail });
    if (trimmedMobile) orChecks.push({ mobile: trimmedMobile });

    const existing = await User.findOne({ where: { [Op.or]: orChecks } });
    if (existing) {
      if (trimmedEmail && existing.email === trimmedEmail) return res.status(409).json({ message: "That email is already registered." });
      if (trimmedMobile && existing.mobile === trimmedMobile) return res.status(409).json({ message: "That mobile number is already registered." });
      return res.status(409).json({ message: "An account with these details already exists." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const registrationMethod = trimmedEmail && trimmedMobile ? "both" : trimmedEmail ? "email" : "mobile";
    const otpTarget = trimmedEmail ? "email" : "mobile";
    const username = await generateUniqueUsername(fullName);

    const user = await User.create({
      fullName: fullName.trim(),
      username,
      email: trimmedEmail,
      mobile: trimmedMobile,
      password: hashed,
      registrationMethod,
      status: "pending_verification",
    });

    const { otp, emailResult } = await issueOtp(user, "register", otpTarget);

    res.status(201).json({
      userId: user.id,
      username: user.username,
      otpTarget,
      maskedTarget: maskTarget(otpTarget, user),
      demoOtp: otp,
      emailSent: emailResult.sent,
      message: `Registration successful. Please verify the code sent to your ${otpTarget}.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ message: "OTP is required." });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (!user.otpPurpose) return res.status(400).json({ message: "There is no pending verification for this account." });

    if (!user.otpExpiresAt || new Date(user.otpExpiresAt) < new Date()) {
      return res.status(400).json({ message: "This code has expired. Please request a new one.", code: "EXPIRED" });
    }

    const { otpMaxAttempts } = await getAuthSettings();
    if (user.otpAttempts >= otpMaxAttempts) {
      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new code.",
        code: "TOO_MANY_ATTEMPTS",
      });
    }

    if (String(otp).trim() !== user.otpCode) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Incorrect code. Please try again.", code: "INVALID" });
    }

    const purpose = user.otpPurpose;

    if (purpose === "register") {
      if (user.otpTarget === "email") user.emailVerified = true;
      else user.mobileVerified = true;
      user.status = "active";

      user.otpCode = null;
      user.otpExpiresAt = null;
      user.otpPurpose = null;
      user.otpTarget = null;
      user.otpAttempts = 0;
      // OTP verification immediately establishes an authenticated session,
      // so it's a real login — record it the same way login() does.
      user.lastLoginAt = new Date();
      await user.save();

      sendWelcomeEmail(user).catch(() => {});
      recordNewUserActivity(user).catch(() => {});
      const sessionId = await recordLoginSuccess(user, req, { loginMethod: "Registration + OTP" });
      const token = signUserToken(user, false, sessionId);
      return res.json({ token, user: toPublicUser(user), verified: true });
    }

    if (purpose === "login") {
      // Account is already active/verified — this is a returning user, not a
      // new one, so (unlike the register branch above) no welcome email and
      // no "new user" community activity post.
      user.otpCode = null;
      user.otpExpiresAt = null;
      user.otpPurpose = null;
      user.otpTarget = null;
      user.otpAttempts = 0;
      user.lastLoginAt = new Date();
      await user.save();

      const sessionId = await recordLoginSuccess(user, req, { loginMethod: "otp" });
      const token = signUserToken(user, false, sessionId);
      return res.json({ token, user: toPublicUser(user), verified: true });
    }

    if (purpose === "update_contact") {
      if (user.otpTarget === "email") user.emailVerified = true;
      else user.mobileVerified = true;

      user.otpCode = null;
      user.otpExpiresAt = null;
      user.otpPurpose = null;
      user.otpTarget = null;
      user.otpAttempts = 0;
      await user.save();

      return res.json({ verified: true, purpose, user: toPublicUser(user) });
    }

    // reset_password purpose: this step only confirms the code is correct.
    // The OTP fields stay in place so the follow-up resetPassword call can
    // validate the same code again before it actually changes the password.
    user.otpAttempts = 0;
    await user.save();
    res.json({ verified: true, purpose });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (!user.otpPurpose || !user.otpTarget) {
      return res.status(400).json({ message: "There is no pending verification for this account." });
    }

    const { otp, emailResult } = await issueOtp(user, user.otpPurpose, user.otpTarget);

    res.json({
      userId: user.id,
      otpTarget: user.otpTarget,
      maskedTarget: maskTarget(user.otpTarget, user),
      demoOtp: otp,
      emailSent: emailResult.sent,
      message: `A new code has been sent to your ${user.otpTarget}.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password, remember } = req.body;
    if (!identifier?.trim() || !password) {
      return res.status(400).json({ message: "Please enter your credentials." });
    }

    const id = identifier.trim();
    const user = await User.findOne({
      where: { [Op.or]: [{ email: id.toLowerCase() }, { mobile: id }] },
    });

    const invalidMessage = "Invalid credentials. Please check and try again.";
    if (!user) return res.status(401).json({ message: invalidMessage });

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      recordLoginFailure(user, req, "Incorrect password").catch(() => {});
      return res.status(401).json({ message: invalidMessage });
    }

    if (user.status === "pending_verification") {
      recordLoginFailure(user, req, "Account pending verification").catch(() => {});
      return res.status(403).json({
        message: "Please verify your account to continue.",
        code: "UNVERIFIED",
        userId: user.id,
        otpTarget: user.otpTarget,
        maskedTarget: user.otpTarget ? maskTarget(user.otpTarget, user) : null,
      });
    }
    if (user.status === "suspended") {
      recordLoginFailure(user, req, "Account suspended").catch(() => {});
      return res.status(403).json({ message: "This account has been suspended. Please contact support." });
    }
    if (user.status === "inactive") {
      recordLoginFailure(user, req, "Account inactive").catch(() => {});
      return res.status(403).json({ message: "This account is inactive. Please contact support." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const sessionId = await recordLoginSuccess(user, req, { loginMethod: "password" });
    const token = signUserToken(user, remember, sessionId);
    res.json({ token, user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendLoginOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier?.trim()) {
      return res.status(400).json({ message: "Enter your email address or mobile number." });
    }

    const id = identifier.trim();
    const user = await User.findOne({
      where: { [Op.or]: [{ email: id.toLowerCase() }, { mobile: id }] },
    });

    const invalidMessage = "We couldn't find an account with those details.";
    if (!user) return res.status(404).json({ message: invalidMessage });

    if (user.status === "pending_verification") {
      return res.status(403).json({
        message: "Please verify your account before signing in with a code.",
        code: "UNVERIFIED",
        userId: user.id,
        otpTarget: user.otpTarget,
        maskedTarget: user.otpTarget ? maskTarget(user.otpTarget, user) : null,
      });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ message: "This account has been suspended. Please contact support." });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ message: "This account is inactive. Please contact support." });
    }

    const otpTarget = user.email && id.toLowerCase() === user.email ? "email" : "mobile";
    if (otpTarget === "mobile" && !user.mobile) {
      return res.status(400).json({ message: "This account has no mobile number on file to send a code to." });
    }
    if (otpTarget === "email" && !user.email) {
      return res.status(400).json({ message: "This account has no email address on file to send a code to." });
    }

    const { otp, emailResult } = await issueOtp(user, "login", otpTarget);

    res.json({
      userId: user.id,
      otpTarget,
      maskedTarget: maskTarget(otpTarget, user),
      demoOtp: otp,
      emailSent: emailResult.sent,
      message: `A sign-in code has been sent to your ${otpTarget}.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) await recordLogout(user, req.user.sid, req, "user_initiated");
    res.json({ message: "Logged out." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });

    if (req.body.fullName !== undefined) {
      if (!req.body.fullName.trim()) return res.status(400).json({ message: "Full name is required." });
      user.fullName = req.body.fullName.trim();
    }

    if (req.body.email !== undefined) {
      const nextEmail = req.body.email.trim().toLowerCase();
      if (nextEmail && !EMAIL_RE.test(nextEmail)) return res.status(400).json({ message: "Enter a valid email address." });
      if (nextEmail && nextEmail !== user.email) {
        const existing = await User.findOne({ where: { email: nextEmail } });
        if (existing) return res.status(409).json({ message: "That email is already in use by another account." });
        user.email = nextEmail;
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

    const MARITAL_STATUSES = new Set(["single", "married", "other"]);
    if (req.body.maritalStatus !== undefined) {
      if (req.body.maritalStatus && !MARITAL_STATUSES.has(req.body.maritalStatus)) return res.status(400).json({ message: "Enter a valid marital status." });
      user.maritalStatus = req.body.maritalStatus || null;
    }

    if (req.body.dateOfBirth !== undefined) {
      user.dateOfBirth = req.body.dateOfBirth || null;
    }

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
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (!req.file) return res.status(400).json({ message: "No photo was uploaded." });

    const previousPath = user.profilePhoto;
    user.profilePhoto = `/uploads/profile-photos/${req.file.filename}`;
    await user.save();

    if (previousPath) {
      fs.unlink(`.${previousPath}`, () => {});
    }

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });

    const previousPath = user.profilePhoto;
    user.profilePhoto = null;
    await user.save();

    if (previousPath) {
      fs.unlink(`.${previousPath}`, () => {});
    }

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendContactUpdateOtp = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });

    const target = req.body.target === "mobile" ? "mobile" : "email";
    if (target === "email" && !user.email) return res.status(400).json({ message: "Add an email address first." });
    if (target === "mobile" && !user.mobile) return res.status(400).json({ message: "Add a mobile number first." });

    const { otp, emailResult } = await issueOtp(user, "update_contact", target);
    res.json({
      otpTarget: target,
      maskedTarget: maskTarget(target, user),
      demoOtp: otp,
      emailSent: emailResult.sent,
      message: `A verification code has been sent to your ${target}.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "Account not found." });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required." });
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: "New password must be at least 8 characters and include a letter and a number." });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) return res.status(400).json({ message: "Current password is incorrect." });

    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion += 1;
    await user.save();

    const token = signUserToken(user, true);
    res.json({ message: "Password updated successfully.", token, user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier?.trim()) return res.status(400).json({ message: "Enter your email address or mobile number." });

    const id = identifier.trim();
    const user = await User.findOne({
      where: { [Op.or]: [{ email: id.toLowerCase() }, { mobile: id }] },
    });

    // Always respond success-shaped to avoid leaking which accounts exist.
    if (!user) {
      return res.json({ requested: true, message: "If an account matches those details, a reset code has been sent." });
    }

    const otpTarget = user.email ? "email" : "mobile";
    const { otp, emailResult } = await issueOtp(user, "reset_password", otpTarget);

    res.json({
      requested: true,
      userId: user.id,
      otpTarget,
      maskedTarget: maskTarget(otpTarget, user),
      demoOtp: otp,
      emailSent: emailResult.sent,
      message: `A reset code has been sent to your ${otpTarget}.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword, confirmPassword } = req.body;
    if (!userId || !otp) return res.status(400).json({ message: "OTP is required." });
    if (!newPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and include a letter and a number." });
    }
    if (newPassword !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Account not found." });
    if (user.otpPurpose !== "reset_password") return res.status(400).json({ message: "There is no pending reset request for this account." });
    if (!user.otpExpiresAt || new Date(user.otpExpiresAt) < new Date()) {
      return res.status(400).json({ message: "This code has expired. Please request a new one.", code: "EXPIRED" });
    }
    if (String(otp).trim() !== user.otpCode) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Incorrect code. Please try again.", code: "INVALID" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;
    user.otpTarget = null;
    user.otpAttempts = 0;
    await user.save();

    res.json({ message: "Your password has been reset. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
