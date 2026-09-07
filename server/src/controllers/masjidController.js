import fs from "fs";
import { Op, fn, col } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidDonationAccount from "../models/MasjidDonationAccount.js";
import MasjidHistory from "../models/MasjidHistory.js";
import MasjidContactDesignation from "../models/MasjidContactDesignation.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import Campaign from "../models/Campaign.js";
import DeletionReason from "../models/DeletionReason.js";
import User from "../models/User.js";
import { sendMasjidSubmittedAdminEmail, sendMasjidSubmittedUserEmail } from "../services/emailService.js";
import { mediaTypeOf, IMAGE_MAX_BYTES } from "../middleware/upload.js";
import { firstRestrictedField, RESTRICTED_CONTENT_MESSAGE } from "../utils/contentModeration.js";
import { classifyContent } from "../services/aiProviderService.js";
import { getEngagementFor, getEngagementForMany } from "../services/masjidEngagementService.js";

// Second-layer contextual check (Layer 2 of the Common Content Moderation
// Engine) — run only on fields the rule-based filter above did NOT already
// flag. No-op (returns null per field) until ANTHROPIC_API_KEY is
// configured, so rule-based-only moderation is the real, active layer until
// then. Unlike reviews (which can be held "pending" for admin review),
// masjid identity fields have no such intermediate state, so a flagged
// field blocks submission outright, same as a rule-based match.
async function firstAiFlaggedField(fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    const result = await classifyContent({ text: value, contentType: "masjid_field" });
    if (result && result.classification !== "safe") return key;
  }
  return null;
}

// UPI addressing per NPCI: identifier "@" provider handle.
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,63}$/;
// RBI format: 4-letter bank code, reserved "0", 6-character branch code.
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;
// A bank-registered holder name: letters, spaces, and the punctuation banks
// commonly allow (apostrophes, hyphens, periods) — not digits or symbols.
const NAME_RE = /^[A-Za-z][A-Za-z.'\- ]{1,99}$/;
export const EDITABLE_STATUSES = new Set(["draft", "changes_requested"]);

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
  const [photos, donationAccount, contacts, engagement] = await Promise.all([
    MasjidPhoto.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] }),
    MasjidDonationAccount.findOne({ where: { masjidId: masjid.id } }),
    MasjidContactPerson.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] }),
    getEngagementFor(masjid.id),
  ]);
  return {
    ...masjid.toJSON(),
    ...engagement,
    photos,
    donationAccount: donationAccount ? maskDonationAccount(donationAccount) : null,
    contacts: contacts.map((c) => ({ ...c.toJSON(), otpCode: undefined })),
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
    const masjids = await Masjid.findAll({
      where: { userId: req.user.id, status: { [Op.ne]: "deleted" } },
      order: [["createdAt", "DESC"]],
    });
    const engagementMap = await getEngagementForMany(masjids.map((m) => m.id));
    const withCounts = await Promise.all(
      masjids.map(async (m) => {
        const [coverPhoto, campaignCount, activeCampaignCount, mediaCounts, imam] = await Promise.all([
          MasjidPhoto.findOne({ where: { masjidId: m.id, isCover: true } }),
          Campaign.count({ where: { masjidId: m.id } }),
          Campaign.count({ where: { masjidId: m.id, status: "active" } }),
          MasjidPhoto.findAll({
            where: { masjidId: m.id },
            attributes: ["mediaType", [fn("COUNT", col("id")), "count"]],
            group: ["mediaType"],
            raw: true,
          }),
          MasjidContactPerson.findOne({ where: { masjidId: m.id, designation: "Imam" } }),
        ]);
        const photoCount = Number(mediaCounts.find((r) => r.mediaType === "photo")?.count || 0);
        const videoCount = Number(mediaCounts.find((r) => r.mediaType === "video")?.count || 0);
        return {
          ...m.toJSON(),
          otpCode: undefined,
          coverPhotoUrl: coverPhoto?.url || null,
          campaignCount,
          activeCampaignCount,
          photoCount,
          videoCount,
          imamName: imam?.name || null,
          ...(engagementMap.get(m.id) || { likeCount: 0, avgRating: 0, reviewCount: 0, likedByMe: false }),
        };
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

// Real-time (debounced, as-you-type) check for the wizard — same engine and
// same generic message as the save-time check, just without persisting
// anything. Never echoes back which word matched, only which field.
export const checkContent = async (req, res) => {
  try {
    const { name, tagline, about } = req.body;
    const restrictedField = await firstRestrictedField({ name, tagline, about });
    res.json({ field: restrictedField, message: restrictedField ? RESTRICTED_CONTENT_MESSAGE : null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDraft = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Masjid name is required." });

    if (await firstRestrictedField({ name: name.trim() })) {
      return res.status(400).json({ field: "name", message: RESTRICTED_CONTENT_MESSAGE });
    }

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
  "placeId",
];

// Matches the VARCHAR(255) columns these fields map to in the masjids table —
// checked up front so the user sees a friendly, field-attached message instead
// of a raw "Data too long for column" error surfacing only after save.
const STRING_FIELD_MAX = 255;
const STRING_FIELD_LABELS = {
  name: "Masjid Name",
  tagline: "Tagline / Short Description",
  category: "Masjid Category",
  address: "Address",
  area: "Area / Locality",
  city: "City",
  district: "District",
  state: "State / Province",
  country: "Country",
  postalCode: "Postal / ZIP Code",
  mapLink: "Map Link",
  formattedAddress: "Formatted Address",
  placeId: "Google Place ID",
};

export const update = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!EDITABLE_STATUSES.has(masjid.status)) {
      return res.status(400).json({ message: "This masjid can't be edited while it's under review." });
    }

    // Name identifies the record and is required, so an empty value is a bug in
    // the caller rather than an intentional edit — reject it instead of wiping.
    if (req.body.name !== undefined && !req.body.name?.trim()) {
      return res.status(400).json({ field: "name", message: "Masjid name can't be empty." });
    }

    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) masjid[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
    }
    for (const [field, label] of Object.entries(STRING_FIELD_LABELS)) {
      if (masjid[field] && masjid[field].length > STRING_FIELD_MAX) {
        return res.status(400).json({ field, message: `${label} must be ${STRING_FIELD_MAX} characters or fewer.` });
      }
    }
    if (masjid.about && masjid.about.length > 5000) return res.status(400).json({ field: "about", message: "About the Masjid must be 5000 characters or fewer." });
    if (masjid.yearEstablished) {
      const year = Number(masjid.yearEstablished);
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(masjid.yearEstablished) || year < 1300 || year > currentYear) {
        return res.status(400).json({ field: "yearEstablished", message: `Enter a valid year between 1300 and ${currentYear}.` });
      }
    }

    // Meta → Review Restricted Words is the single source of truth for this
    // check — same engine the Reviews feature uses, so an admin edit to that
    // library governs Masjid Name/Tagline/About with no code change here.
    const restrictedField = await firstRestrictedField({ name: masjid.name, tagline: masjid.tagline, about: masjid.about });
    if (restrictedField) {
      return res.status(400).json({ field: restrictedField, message: RESTRICTED_CONTENT_MESSAGE });
    }
    const aiFlaggedField = await firstAiFlaggedField({ name: masjid.name, tagline: masjid.tagline, about: masjid.about });
    if (aiFlaggedField) {
      return res.status(400).json({ field: aiFlaggedField, message: RESTRICTED_CONTENT_MESSAGE });
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

    const { upiId, upiAccountHolder, bankName, accountHolderName, accountNumber, ifscCode, branchName } = req.body;

    const trimmedUpi = upiId?.trim();
    const trimmedAccount = accountNumber?.trim();
    const trimmedIfsc = ifscCode?.trim().toUpperCase();

    if (trimmedUpi && !UPI_RE.test(trimmedUpi)) {
      return res.status(400).json({ message: "Enter a valid UPI ID, for example name@okhdfcbank." });
    }
    if (trimmedUpi && !upiAccountHolder?.trim()) {
      return res.status(400).json({ message: "Add the name registered against this UPI ID." });
    }
    if (trimmedUpi && upiAccountHolder?.trim() && !NAME_RE.test(upiAccountHolder.trim())) {
      return res.status(400).json({ message: "Enter a valid name — letters, spaces, and basic punctuation only." });
    }
    if (trimmedAccount) {
      if (!ACCOUNT_RE.test(trimmedAccount)) {
        return res.status(400).json({ message: "Account number must be 9–18 digits." });
      }
      if (!trimmedIfsc) return res.status(400).json({ message: "IFSC is required with a bank account number." });
      if (!accountHolderName?.trim()) return res.status(400).json({ message: "Add the account holder's name." });
      if (!NAME_RE.test(accountHolderName.trim())) {
        return res.status(400).json({ message: "Enter a valid account holder name — letters, spaces, and basic punctuation only." });
      }
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

export const deleteMasjid = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (masjid.status === "deleted") return res.status(400).json({ message: "This masjid has already been deleted." });

    const campaignCount = await Campaign.count({ where: { masjidId: masjid.id } });
    if (campaignCount > 0) {
      return res.status(409).json({
        message: "This masjid is currently associated with one or more campaigns. Please close/remove the associated campaigns before deleting the masjid.",
        campaignCount,
      });
    }

    const { reason, comment } = req.body;
    const validReason = reason?.trim() && (await DeletionReason.findOne({ where: { name: reason.trim(), isActive: true } }));
    if (!validReason) {
      return res.status(400).json({ message: "Please select a reason for deletion." });
    }
    if (reason.trim() === "Other" && !comment?.trim()) {
      return res.status(400).json({ message: "Please describe the reason for deletion." });
    }

    masjid.status = "deleted";
    masjid.deletionReason = reason.trim();
    masjid.deletionComment = comment?.trim() || null;
    masjid.deletedAt = new Date();
    await masjid.save();
    await logHistory(masjid.id, "deleted", comment?.trim() ? `${reason.trim()} — ${comment.trim()}` : reason.trim(), null);

    res.json({ deleted: true });
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

export const submit = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req, res);
    if (!masjid) return;
    if (!EDITABLE_STATUSES.has(masjid.status)) {
      return res.status(400).json({ message: "This masjid has already been submitted." });
    }

    const required = ["name", "tagline", "category", "about", "address", "city", "country"];
    const missing = required.filter((f) => !masjid[f]?.toString().trim());
    if (missing.length) {
      const labels = missing.map((f) => STRING_FIELD_LABELS[f] || f);
      return res.status(400).json({ message: `Please complete: ${labels.join(", ")}.` });
    }

    // Re-checked here too (not just on save) as defense-in-depth against the
    // library changing between the last edit and submission.
    const restrictedField = await firstRestrictedField({ name: masjid.name, tagline: masjid.tagline, about: masjid.about });
    if (restrictedField) {
      return res.status(400).json({ field: restrictedField, message: RESTRICTED_CONTENT_MESSAGE });
    }
    const aiFlaggedField = await firstAiFlaggedField({ name: masjid.name, tagline: masjid.tagline, about: masjid.about });
    if (aiFlaggedField) {
      return res.status(400).json({ field: aiFlaggedField, message: RESTRICTED_CONTENT_MESSAGE });
    }

    // The mandatory-office-bearers gate: every isRequired designation (seeded
    // with Imam/Mutawalli/Secretary, but admin-configurable) must have a
    // verified person before a masjid can be submitted. Enforced here (not
    // just in the wizard's UI) so it can't be bypassed by a direct API call.
    const requiredDesignations = await MasjidContactDesignation.findAll({ where: { isRequired: true } });
    const contacts = await MasjidContactPerson.findAll({ where: { masjidId: masjid.id } });
    const missingDesignations = requiredDesignations.filter(
      (d) => !contacts.some((c) => c.designation === d.name && c.verified)
    );
    if (missingDesignations.length) {
      return res.status(400).json({
        message: `Masjid verification cannot continue. Please add and verify the mobile number${missingDesignations.length > 1 ? "s" : ""} of the ${missingDesignations.map((d) => d.name).join(", ")}.`,
      });
    }

    const photoCount = await MasjidPhoto.count({ where: { masjidId: masjid.id } });
    if (photoCount === 0) return res.status(400).json({ message: "Upload at least one photograph before submitting." });

    const wasChangesRequested = masjid.status === "changes_requested";
    masjid.status = "under_review";
    masjid.adminFeedback = null;
    masjid.submittedAt = new Date();
    await masjid.save();

    await logHistory(masjid.id, wasChangesRequested ? "resubmitted" : "submitted", null, null);

    const submitter = await User.findByPk(masjid.userId);
    sendMasjidSubmittedAdminEmail(masjid, submitter).catch(() => {});
    sendMasjidSubmittedUserEmail(masjid, submitter).catch(() => {});

    res.json({ masjid: await serializeMasjid(masjid) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
