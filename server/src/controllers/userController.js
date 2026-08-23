import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import User from "../models/User.js";
import { sendWelcomeEmail, sendOtpEmail } from "../services/emailService.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_EXPIRY = "12h";
const REMEMBER_EXPIRY = "30d";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MOBILE_RE = /^[0-9]{10}$/;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}

function maskMobile(mobile) {
  return mobile.length <= 4 ? mobile : `${"*".repeat(mobile.length - 4)}${mobile.slice(-4)}`;
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
  };
}

function signUserToken(user, remember) {
  return jwt.sign({ id: user.id, type: "user" }, process.env.JWT_SECRET, {
    expiresIn: remember ? REMEMBER_EXPIRY : SESSION_EXPIRY,
  });
}

async function issueOtp(user, purpose, otpTarget) {
  const otp = generateOtp();
  user.otpCode = otp;
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
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
    }

    user.otpCode = null;
    user.otpExpiresAt = null;
    user.otpPurpose = null;
    user.otpTarget = null;
    user.otpAttempts = 0;
    await user.save();

    if (purpose === "register") {
      sendWelcomeEmail(user).catch(() => {});
      const token = signUserToken(user);
      return res.json({ token, user: toPublicUser(user), verified: true });
    }

    // reset_password purpose: verification alone doesn't log the user in — resetPassword handles the rest
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
    if (!matches) return res.status(401).json({ message: invalidMessage });

    if (user.status === "pending_verification") {
      return res.status(403).json({
        message: "Please verify your account to continue.",
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

    user.lastLoginAt = new Date();
    await user.save();

    const token = signUserToken(user, remember);
    res.json({ token, user: toPublicUser(user) });
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
