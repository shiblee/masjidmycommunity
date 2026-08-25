import fs from "fs";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidDonationAccount from "../models/MasjidDonationAccount.js";
import MasjidHistory from "../models/MasjidHistory.js";
import User from "../models/User.js";
import { sendNotification } from "../services/emailService.js";
import { mediaTypeOf, IMAGE_MAX_BYTES } from "../middleware/upload.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MOBILE_RE = /^[0-9]{10}$/;
// UPI addressing per NPCI: identifier "@" provider handle.
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,63}$/;
// RBI format: 4-letter bank code, reserved "0", 6-character branch code.
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;
const EDITABLE_STATUSES = new Set(["draft", "changes_requested"]);

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function logHistory(masjidId, action, note, actorName) {
  await MasjidHistory.create({ masjidId, action, actorType: "user", actorName: actorName || "Owner", note: note || null });
}

async function findOwnedMasjid(req, res) {
  const masjid = await Masjid.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!masjid) {
    res.status(404).json({ message: "Masjid not found." });
    return null;
  }
  return masjid;
}

async function serializeMasjid(masjid) {
  const [photos, donationAccount] = await Promise.all([
    MasjidPhoto.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] }),
    MasjidDonationAccount.findOne({ where: { masjidId: masjid.id } }),
  ]);
  return {
    ...masjid.toJSON(),
    otpCode: undefined,
    photos,
    donationAccount: donationAccount ? maskDonationAccount(donationAccount) : null,
  };
}

function maskDonationAccount(acc) {
  const json = acc.toJSON();
  if (json.accountNumber) {
    const digits = json.accountNumber;
    json.accountNumberMasked = digits.length <= 4 ? digits : `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
  }
  delete json.accountNumber;
  return json;
}

export const listMine = async (req, res) => {
  try {
    const masjids = await Masjid.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    const withCounts = await Promise.all(
      masjids.map(async (m) => {
        const coverPhoto = await MasjidPhoto.findOne({ where: { masjidId: m.id, isCover: true } });
        return { ...m.toJSON(), otpCode: undefined, coverPhotoUrl: coverPhoto?.url || null };
      })
    );
    res.json({ masjids: withCounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    res.json({ masjid: await serializeMasjid(masjid) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDraft = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Masjid name is required." });

    const masjid = await Masjid.create({ userId: req.user.id, name: name.trim(), status: "draft" });
    await logHistory(masjid.id, "draft_created", null, null);
    res.status(201).json({ masjid: await serializeMasjid(masjid) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const UPDATABLE_FIELDS = [
  "name",
  "tagline",
  "about",
  "yearEstablished",
  "category",
  "address",
  "area",
  "city",
  "district",
  "state",
  "country",
  "postalCode",
  "mapLink",
  "formattedAddress",
  "latitude",
  "longitude",
  "imamName",
  "contactMobile",
  "contactEmail",
];

export const update = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!EDITABLE_STATUSES.has(masjid.status)) {
      return res.status(400).json({ message: "This masjid can't be edited while it's under review." });
    }

    const nextContactEmail = req.body.contactEmail?.trim().toLowerCase();
    const nextContactMobile = req.body.contactMobile?.trim();
    if (nextContactEmail && nextContactEmail !== masjid.contactEmail) masjid.emailVerified = false;
    if (nextContactMobile && nextContactMobile !== masjid.contactMobile) masjid.mobileVerified = false;

    // Name identifies the record and is required, so an empty value is a bug in
    // the caller rather than an intentional edit — reject it instead of wiping.
    if (req.body.name !== undefined && !req.body.name?.trim()) {
      return res.status(400).json({ message: "Masjid name can't be empty." });
    }

    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) masjid[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
    }
    if (masjid.contactEmail && !EMAIL_RE.test(masjid.contactEmail)) return res.status(400).json({ message: "Enter a valid contact email." });
    if (masjid.contactMobile && !MOBILE_RE.test(masjid.contactMobile)) return res.status(400).json({ message: "Enter a valid 10-digit mobile number." });
    if (masjid.about && masjid.about.length > 5000) return res.status(400).json({ message: "About the Masjid must be 5000 characters or fewer." });
    if (masjid.yearEstablished) {
      const year = Number(masjid.yearEstablished);
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(masjid.yearEstablished) || year < 1300 || year > currentYear) {
        return res.status(400).json({ message: `Enter a valid year between 1300 and ${currentYear}.` });
      }
    }

    await masjid.save();
    res.json({ masjid: await serializeMasjid(masjid) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertDonationAccount = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!EDITABLE_STATUSES.has(masjid.status)) {
      return res.status(400).json({ message: "This masjid can't be edited while it's under review." });
    }

    const { upiId, upiAccountHolder, bankName, accountHolderName, accountNumber, confirmAccountNumber, ifscCode, branchName } = req.body;

    const trimmedUpi = upiId?.trim();
    const trimmedAccount = accountNumber?.trim();
    const trimmedIfsc = ifscCode?.trim().toUpperCase();

    if (trimmedUpi && !UPI_RE.test(trimmedUpi)) {
      return res.status(400).json({ message: "Enter a valid UPI ID, for example name@okhdfcbank." });
    }
    if (trimmedUpi && !upiAccountHolder?.trim()) {
      return res.status(400).json({ message: "Add the name registered against this UPI ID." });
    }
    if (trimmedAccount) {
      if (!ACCOUNT_RE.test(trimmedAccount)) {
        return res.status(400).json({ message: "Account number must be 9–18 digits." });
      }
      if (trimmedAccount !== confirmAccountNumber?.trim()) {
        return res.status(400).json({ message: "Account number and confirmation do not match." });
      }
      if (!trimmedIfsc) return res.status(400).json({ message: "IFSC is required with a bank account number." });
      if (!accountHolderName?.trim()) return res.status(400).json({ message: "Add the account holder's name." });
      if (!bankName?.trim()) return res.status(400).json({ message: "Add the bank's name." });
    }
    if (trimmedIfsc && !IFSC_RE.test(trimmedIfsc)) {
      return res.status(400).json({ message: "Enter a valid 11-character IFSC, for example HDFC0001234." });
    }

    const [account] = await MasjidDonationAccount.findOrCreate({ where: { masjidId: masjid.id } });
    account.upiId = trimmedUpi ?? account.upiId;
    account.upiAccountHolder = upiAccountHolder ?? account.upiAccountHolder;
    account.bankName = bankName ?? account.bankName;
    account.accountHolderName = accountHolderName ?? account.accountHolderName;
    if (trimmedAccount) account.accountNumber = trimmedAccount;
    account.ifscCode = trimmedIfsc ?? account.ifscCode;
    account.branchName = branchName ?? account.branchName;
    account.verified = false;
    await account.save();

    res.json({ donationAccount: maskDonationAccount(account) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadPhotos = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!req.files?.length) return res.status(400).json({ message: "No photos or videos were uploaded." });

    // Multer only enforces one ceiling for the whole field (sized for video);
    // a photo past the tighter image limit is rejected here instead.
    const oversizedImage = req.files.find((file) => mediaTypeOf(file.mimetype) === "photo" && file.size > IMAGE_MAX_BYTES);
    if (oversizedImage) {
      req.files.forEach((file) => fs.unlink(file.path, () => {}));
      return res.status(400).json({ message: `Photos must be under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB. "${oversizedImage.originalname}" is too large.` });
    }

    const existingCount = await MasjidPhoto.count({ where: { masjidId: masjid.id } });
    const hasCover = existingCount > 0 || (await MasjidPhoto.count({ where: { masjidId: masjid.id, isCover: true } })) > 0;
    let coverAssigned = hasCover;

    const created = await Promise.all(
      req.files.map((file, i) => {
        const mediaType = mediaTypeOf(file.mimetype);
        // The cover shows as a still image across the site (explore cards,
        // profile hero), so only a photo is ever auto-picked as the default.
        const isCover = !coverAssigned && mediaType === "photo";
        if (isCover) coverAssigned = true;
        return MasjidPhoto.create({
          masjidId: masjid.id,
          url: `/uploads/masjid-photos/${file.filename}`,
          mediaType,
          category: req.body.category || "other",
          isCover,
          sortOrder: existingCount + i,
        });
      })
    );
    res.status(201).json({ photos: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePhoto = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const photo = await MasjidPhoto.findOne({ where: { id: req.params.photoId, masjidId: masjid.id } });
    if (!photo) return res.status(404).json({ message: "Photo not found." });

    if (req.body.caption !== undefined) photo.caption = req.body.caption;
    if (req.body.category !== undefined) photo.category = req.body.category;
    if (req.body.sortOrder !== undefined) photo.sortOrder = req.body.sortOrder;
    if (req.body.isCover) {
      if (photo.mediaType === "video") return res.status(400).json({ message: "A video can't be set as the cover — it shows as a still image across the site." });
      await MasjidPhoto.update({ isCover: false }, { where: { masjidId: masjid.id } });
      photo.isCover = true;
    }
    await photo.save();
    res.json({ photo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePhoto = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const photo = await MasjidPhoto.findOne({ where: { id: req.params.photoId, masjidId: masjid.id } });
    if (!photo) return res.status(404).json({ message: "Photo not found." });
    await photo.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMasjidOtp = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const target = req.body.target === "mobile" ? "mobile" : "email";
    if (target === "email" && !masjid.contactEmail) return res.status(400).json({ message: "Add a contact email first." });
    if (target === "mobile" && !masjid.contactMobile) return res.status(400).json({ message: "Add a contact mobile number first." });

    const otp = generateOtp();
    masjid.otpCode = otp;
    masjid.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    masjid.otpTarget = target;
    masjid.otpAttempts = 0;
    await masjid.save();

    let emailSent = false;
    if (target === "email") {
      const owner = await User.findByPk(req.user.id);
      const result = await sendNotification("otp_verification", {
        to: masjid.contactEmail,
        variables: { user_name: masjid.imamName || owner?.fullName || "there", otp_code: otp },
        userMeta: { userId: req.user.id, userEmail: masjid.contactEmail },
      }).catch(() => ({ sent: false }));
      emailSent = result.sent;
    }

    res.json({
      otpTarget: target,
      demoOtp: otp,
      emailSent,
      message: `A verification code has been sent to the masjid's ${target === "email" ? "email address" : "mobile number"}.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const confirmMasjidOtp = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    const { otp } = req.body;
    if (!masjid.otpTarget) return res.status(400).json({ message: "There is no pending verification for this masjid." });
    if (!masjid.otpExpiresAt || new Date(masjid.otpExpiresAt) < new Date()) {
      return res.status(400).json({ message: "This code has expired. Please request a new one.", code: "EXPIRED" });
    }
    if (String(otp).trim() !== masjid.otpCode) {
      masjid.otpAttempts += 1;
      await masjid.save();
      return res.status(400).json({ message: "Incorrect code. Please try again.", code: "INVALID" });
    }

    if (masjid.otpTarget === "email") masjid.emailVerified = true;
    else masjid.mobileVerified = true;
    const verifiedTarget = masjid.otpTarget;

    masjid.otpCode = null;
    masjid.otpExpiresAt = null;
    masjid.otpTarget = null;
    masjid.otpAttempts = 0;
    await masjid.save();

    res.json({ verified: true, target: verifiedTarget });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submit = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!EDITABLE_STATUSES.has(masjid.status)) {
      return res.status(400).json({ message: "This masjid has already been submitted." });
    }

    const required = ["name", "about", "address", "city", "country"];
    const missing = required.filter((f) => !masjid[f]?.toString().trim());
    if (missing.length) return res.status(400).json({ message: `Please complete: ${missing.join(", ")}.` });

    if (!masjid.contactMobile) return res.status(400).json({ message: "A contact mobile number is required." });
    if (!masjid.mobileVerified) {
      return res.status(400).json({ message: "Please verify the masjid's contact mobile number before submitting." });
    }
    // Email is optional, but once supplied it has to be verified like the mobile.
    if (masjid.contactEmail && !masjid.emailVerified) {
      return res.status(400).json({ message: "Please verify the masjid's email address, or remove it before submitting." });
    }
    const photoCount = await MasjidPhoto.count({ where: { masjidId: masjid.id } });
    if (photoCount === 0) return res.status(400).json({ message: "Upload at least one photograph before submitting." });

    const wasChangesRequested = masjid.status === "changes_requested";
    masjid.status = "under_review";
    masjid.adminFeedback = null;
    masjid.submittedAt = new Date();
    await masjid.save();

    await logHistory(masjid.id, wasChangesRequested ? "resubmitted" : "submitted", null, null);

    res.json({ masjid: await serializeMasjid(masjid) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
