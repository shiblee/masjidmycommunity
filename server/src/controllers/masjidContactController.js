import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import MasjidContactDesignation from "../models/MasjidContactDesignation.js";
import AuthSettings from "../models/AuthSettings.js";
import { EDITABLE_STATUSES } from "./masjidController.js";

// Indian mobile numbers: 10 digits, first digit 6-9 per the national numbering plan.
const MOBILE_RE = /^[6-9]\d{9}$/;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getOtpSettings() {
  const settings = await AuthSettings.findByPk(1);
  return {
    otpExpiryMinutes: settings?.otpExpiryMinutes ?? 5,
    otpResendCooldownSeconds: settings?.otpResendCooldownSeconds ?? 60,
    otpMaxAttempts: settings?.otpMaxAttempts ?? 5,
  };
}

async function findOwnedMasjid(req, res) {
  const masjid = await Masjid.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!masjid) {
    res.status(404).json({ message: "Masjid not found." });
    return null;
  }
  return masjid;
}

async function findOwnedContact(req, res, masjid) {
  const contact = await MasjidContactPerson.findOne({ where: { id: req.params.contactId, masjidId: masjid.id } });
  if (!contact) {
    res.status(404).json({ message: "Contact person not found." });
    return null;
  }
  return contact;
}

function serializeContact(contact) {
  return { ...contact.toJSON(), otpCode: undefined };
}

function requireEditable(masjid, res) {
  if (!EDITABLE_STATUSES.has(masjid.status)) {
    res.status(400).json({ message: "This masjid's contacts can't be edited while it's under review." });
    return false;
  }
  return true;
}

// An approved masjid's EXISTING contacts stay locked (they're already public,
// per listPublicContacts below, so changing one without review would silently
// alter public content) — but adding a brand-new office bearer is purely
// additive and only goes public once its mobile is verified, so it's allowed
// here too. This is what lets an approved masjid's Green Tick application add
// a representative that isn't already a contact person.
const ADDABLE_STATUSES = new Set([...EDITABLE_STATUSES, "approved"]);

function requireAddable(masjid, res) {
  if (!ADDABLE_STATUSES.has(masjid.status)) {
    res.status(400).json({ message: "This masjid's contacts can't be edited while it's under review." });
    return false;
  }
  return true;
}

export const list = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const contacts = await MasjidContactPerson.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] });
    res.json({ contacts: contacts.map(serializeContact) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!requireAddable(masjid, res)) return;

    const designationName = req.body.designation?.trim();
    const name = req.body.name?.trim();
    const mobile = req.body.mobile?.trim();

    if (!designationName) return res.status(400).json({ field: "designation", message: "Designation is required." });
    if (!name) return res.status(400).json({ field: "name", message: "Name is required." });
    if (!mobile || !MOBILE_RE.test(mobile)) {
      return res.status(400).json({ field: "mobile", message: "Enter a valid 10-digit Indian mobile number." });
    }

    const designation = await MasjidContactDesignation.findOne({ where: { name: designationName, isActive: true } });
    if (!designation) return res.status(400).json({ field: "designation", message: "Select a valid designation." });

    const existing = await MasjidContactPerson.findAll({ where: { masjidId: masjid.id } });

    // One person per mandatory designation — additional office-bearers of the
    // same required role should edit the existing entry, not add a second one.
    if (designation.isRequired && existing.some((c) => c.designation === designationName)) {
      return res.status(409).json({ field: "designation", message: `A ${designationName} has already been added. Edit that entry instead.` });
    }
    if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.mobile === mobile)) {
      return res.status(409).json({ message: "This person has already been added." });
    }
    if (existing.some((c) => c.mobile === mobile)) {
      return res.status(409).json({ field: "mobile", message: "This mobile number is already used by another person on this masjid." });
    }

    const contact = await MasjidContactPerson.create({
      masjidId: masjid.id,
      designation: designationName,
      name,
      mobile,
      sortOrder: existing.length,
    });
    res.status(201).json({ contact: serializeContact(contact) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!requireEditable(masjid, res)) return;
    const contact = await findOwnedContact(req, res, masjid);
    if (!contact) return;

    const nextDesignationName = req.body.designation !== undefined ? req.body.designation?.trim() : contact.designation;
    const nextName = req.body.name !== undefined ? req.body.name?.trim() : contact.name;
    const nextMobile = req.body.mobile !== undefined ? req.body.mobile?.trim() : contact.mobile;

    if (!nextDesignationName) return res.status(400).json({ field: "designation", message: "Designation is required." });
    if (!nextName) return res.status(400).json({ field: "name", message: "Name is required." });
    if (!nextMobile || !MOBILE_RE.test(nextMobile)) {
      return res.status(400).json({ field: "mobile", message: "Enter a valid 10-digit Indian mobile number." });
    }

    if (nextDesignationName !== contact.designation) {
      const designation = await MasjidContactDesignation.findOne({ where: { name: nextDesignationName, isActive: true } });
      if (!designation) return res.status(400).json({ field: "designation", message: "Select a valid designation." });
      if (designation.isRequired) {
        const clash = await MasjidContactPerson.findOne({
          where: { masjidId: masjid.id, designation: nextDesignationName, id: { [Op.ne]: contact.id } },
        });
        if (clash) return res.status(409).json({ field: "designation", message: `A ${nextDesignationName} has already been added. Edit that entry instead.` });
      }
    }
    if (nextMobile !== contact.mobile) {
      const clash = await MasjidContactPerson.findOne({
        where: { masjidId: masjid.id, mobile: nextMobile, id: { [Op.ne]: contact.id } },
      });
      if (clash) return res.status(409).json({ field: "mobile", message: "This mobile number is already used by another person on this masjid." });

      // Changing the verified mobile number invalidates the earlier verification.
      contact.verified = false;
      contact.otpCode = null;
      contact.otpExpiresAt = null;
      contact.otpAttempts = 0;
    }

    contact.designation = nextDesignationName;
    contact.name = nextName;
    contact.mobile = nextMobile;
    await contact.save();
    res.json({ contact: serializeContact(contact) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!requireEditable(masjid, res)) return;
    const contact = await findOwnedContact(req, res, masjid);
    if (!contact) return;
    await contact.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!requireAddable(masjid, res)) return;
    const contact = await findOwnedContact(req, res, masjid);
    if (!contact) return;

    const { otpExpiryMinutes, otpResendCooldownSeconds } = await getOtpSettings();

    if (contact.otpLastSentAt) {
      const elapsedMs = Date.now() - new Date(contact.otpLastSentAt).getTime();
      const remainingMs = otpResendCooldownSeconds * 1000 - elapsedMs;
      if (remainingMs > 0) {
        return res.status(429).json({
          message: `Please wait ${Math.ceil(remainingMs / 1000)}s before requesting another code.`,
          code: "COOLDOWN",
          retryAfterSeconds: Math.ceil(remainingMs / 1000),
        });
      }
    }

    const otp = generateOtp();
    contact.otpCode = otp;
    contact.otpExpiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000);
    contact.otpAttempts = 0;
    contact.otpLastSentAt = new Date();
    await contact.save();

    // No SMS provider is wired up anywhere in this app yet (matches every
    // other OTP flow — register/login/contact-update/the old masjid verify) —
    // the code is returned directly for the UI to show as a "demo mode" banner.
    res.json({ demoOtp: otp, message: "A verification code has been generated for this mobile number." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const confirmOtp = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!requireAddable(masjid, res)) return;
    const contact = await findOwnedContact(req, res, masjid);
    if (!contact) return;

    const { otpMaxAttempts } = await getOtpSettings();
    const { otp } = req.body;

    if (!contact.otpCode) return res.status(400).json({ message: "There is no pending verification for this person." });
    if (!contact.otpExpiresAt || new Date(contact.otpExpiresAt) < new Date()) {
      return res.status(400).json({ message: "This code has expired. Please request a new one.", code: "EXPIRED" });
    }
    if (contact.otpAttempts >= otpMaxAttempts) {
      return res.status(400).json({ message: "Too many incorrect attempts. Please request a new code.", code: "TOO_MANY_ATTEMPTS" });
    }
    if (String(otp).trim() !== contact.otpCode) {
      contact.otpAttempts += 1;
      await contact.save();
      return res.status(400).json({ message: "Incorrect code. Please try again.", code: "INVALID" });
    }

    contact.verified = true;
    contact.otpCode = null;
    contact.otpExpiresAt = null;
    contact.otpAttempts = 0;
    await contact.save();

    res.json({ contact: serializeContact(contact) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
