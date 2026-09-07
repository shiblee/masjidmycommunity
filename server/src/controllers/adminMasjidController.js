import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidDonationAccount from "../models/MasjidDonationAccount.js";
import MasjidHistory from "../models/MasjidHistory.js";
import MasjidContactDesignation from "../models/MasjidContactDesignation.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import MasjidReview from "../models/MasjidReview.js";
import MasjidFavorite from "../models/MasjidFavorite.js";
import User from "../models/User.js";
import { recordMasjidApprovedActivity } from "../services/communityActivityService.js";
import { sendMasjidChangesRequestedEmail, sendMasjidApprovedEmail, sendMasjidRejectedEmail } from "../services/emailService.js";
import { notifyUser } from "../services/notificationService.js";
import { mediaTypeOf, IMAGE_MAX_BYTES } from "../middleware/upload.js";
import { generateVideoThumbnail } from "../utils/videoThumbnail.js";
import { firstRestrictedField, RESTRICTED_CONTENT_MESSAGE } from "../utils/contentModeration.js";
import { classifyContent } from "../services/aiProviderService.js";
import { getEngagementFor, getEngagementForMany, getRatingDistribution } from "../services/masjidEngagementService.js";
import { getGreenTickBadgeInfo, getGreenTickBadgeInfoForMany } from "../services/greenTickService.js";
import { withReviewers } from "./masjidReviewController.js";
import { PLATFORM_EMAIL } from "../seed/platformUserDefaults.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { generateSeoMeta } from "../services/aiProviderService.js";

// Same second-layer AI check as masjidController.js's own write paths — see
// that file for the full rationale. No-op until an AI provider is configured.
async function firstAiFlaggedField(fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    const result = await classifyContent({ text: value, contentType: "masjid_field" });
    if (result && result.classification !== "safe") return key;
  }
  return null;
}

async function logHistory(masjidId, action, note, actorName) {
  await MasjidHistory.create({ masjidId, action, actorType: "admin", actorName: actorName || "Admin", note: note || null });
}

function maskAccountNumber(digits) {
  if (!digits) return digits;
  return digits.length <= 4 ? digits : `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

// Matches the VARCHAR(255) columns these fields map to — mirrors
// masjidController.js's owner-side UPDATABLE_FIELDS/STRING_FIELD_LABELS
// (duplicated rather than shared, matching this codebase's existing
// per-controller-constant convention).
const UPDATABLE_FIELDS = [
  "name", "tagline", "about", "yearEstablished", "category",
  "address", "area", "city", "district", "state", "country", "postalCode", "mapLink", "formattedAddress",
  "latitude", "longitude",
];
const STRING_FIELD_MAX = 255;
const STRING_FIELD_LABELS = {
  name: "Masjid Name", tagline: "Tagline / Short Description", category: "Masjid Category",
  address: "Address", area: "Area / Locality", city: "City", district: "District",
  state: "State / Province", country: "Country", postalCode: "Postal / ZIP Code",
  mapLink: "Map Link", formattedAddress: "Formatted Address",
};
const REQUIRED_MASJID_FIELDS = ["name", "about", "address", "city", "country"];

// Mirrors the exact three checks masjidController.js's submit() enforces, so
// this badge can never drift from what "ready to submit" actually means.
async function computeMasjidCompletion(masjid, contacts, photoCount) {
  const requiredDesignations = await MasjidContactDesignation.findAll({ where: { isRequired: true } });
  const basicInfoDone = REQUIRED_MASJID_FIELDS.every((f) => masjid[f]?.toString().trim());
  const contactsDone = requiredDesignations.every((d) => contacts.some((c) => c.designation === d.name && c.verified));
  const photosDone = photoCount > 0;
  const done = [basicInfoDone, contactsDone, photosDone].filter(Boolean).length;
  return Math.round((done / 3) * 100);
}

const DB_SORT_COLUMNS = {
  name: "name",
  location: "city",
  createdAt: "createdAt",
  status: "status",
};

const ENGAGEMENT_SORT_KEYS = new Set(["avgRating", "likeCount", "viewCount"]);

const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  rejected: "Rejected",
  inactive: "Inactive",
  deleted: "Deleted",
};

// Admin-initiated registration — mirrors the owner wizard's own
// createDraft (name only; everything else is filled in afterward via the
// same Basic Info/Contact/Photos/Donation tabs used to review any other
// masjid). Owned by the platform account so it reads as "Masjid My
// Community" wherever a masjid's registering identity is shown, rather
// than requiring a real end-user to exist first.
export const createMasjid = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Masjid name is required." });

    const platformUser = await User.findOne({ where: { email: PLATFORM_EMAIL } });
    if (!platformUser) return res.status(500).json({ message: "Platform account is not configured." });

    const slug = await generateUniqueSlug(Masjid, name.trim(), { fallback: "masjid" });
    const masjid = await Masjid.create({ userId: platformUser.id, name: name.trim(), slug, status: "draft" });
    await logHistory(masjid.id, "admin_created", null, req.user.email);
    res.status(201).json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listAll = async (req, res) => {
  try {
    const { status, q, category, page = 1, pageSize = 20, sortBy = "createdAt", sortDir = "desc" } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (category && category !== "all") where.category = category;

    if (q) {
      const term = q.trim();
      const like = { [Op.like]: `%${term}%` };
      const matchingOwners = await User.findAll({
        where: { [Op.or]: [{ fullName: like }, { email: like }, { mobile: like }] },
        attributes: ["id"],
      });
      // Office-bearer name/mobile now lives on MasjidContactPerson, not a
      // column on Masjid itself — matched via masjidId like matchingOwners.
      const matchingContacts = await MasjidContactPerson.findAll({
        where: { [Op.or]: [{ name: like }, { mobile: like }] },
        attributes: ["masjidId"],
      });
      const matchingStatuses = Object.entries(STATUS_LABELS)
        .filter(([key, label]) => key.includes(term.toLowerCase()) || label.toLowerCase().includes(term.toLowerCase()))
        .map(([key]) => key);
      const asId = /^\d+$/.test(term) ? Number(term) : null;

      where[Op.or] = [
        { name: like },
        { tagline: like },
        { address: like },
        { area: like },
        { city: like },
        { district: like },
        { state: like },
        { country: like },
        { postalCode: like },
        ...(asId !== null ? [{ id: asId }] : []),
        ...(matchingOwners.length ? [{ userId: { [Op.in]: matchingOwners.map((u) => u.id) } }] : []),
        ...(matchingStatuses.length ? [{ status: { [Op.in]: matchingStatuses } }] : []),
        ...(matchingContacts.length ? [{ id: { [Op.in]: matchingContacts.map((c) => c.masjidId) } }] : []),
      ];
    }

    const limit = Math.min(Number(pageSize) || 20, 100);
    const page1 = Math.max(Number(page) || 1, 1);
    const offset = (page1 - 1) * limit;
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    // "Registered By" isn't a column on Masjid — it's pulled from the User
    // table, so it can't be sorted by the DB alongside the rest. Fetch every
    // matching row, sort by owner name in JS, then paginate manually.
    let rows, count;
    if (sortBy === "ownerName") {
      const all = await Masjid.findAll({ where, order: [["createdAt", "DESC"]] });
      const ownerIds = [...new Set(all.map((m) => m.userId))];
      const owners = await User.findAll({ where: { id: ownerIds }, attributes: ["id", "fullName"] });
      const nameById = Object.fromEntries(owners.map((u) => [u.id, u.fullName || ""]));
      all.sort((a, b) => {
        const av = nameById[a.userId] || "";
        const bv = nameById[b.userId] || "";
        const cmp = av.localeCompare(bv);
        return dir === "ASC" ? cmp : -cmp;
      });
      count = all.length;
      rows = all.slice(offset, offset + limit);
    } else if (ENGAGEMENT_SORT_KEYS.has(sortBy)) {
      // Rating/Likes/Views aren't columns on Masjid either — they're
      // computed by masjidEngagementService from other tables — so the same
      // fetch-all-then-sort-in-JS approach as ownerName above applies here.
      const all = await Masjid.findAll({ where, order: [["createdAt", "DESC"]] });
      const engagementMap = await getEngagementForMany(all.map((m) => m.id));
      all.sort((a, b) => {
        const av = engagementMap.get(a.id)?.[sortBy] || 0;
        const bv = engagementMap.get(b.id)?.[sortBy] || 0;
        const cmp = av - bv;
        return dir === "ASC" ? cmp : -cmp;
      });
      count = all.length;
      rows = all.slice(offset, offset + limit);
    } else {
      const column = DB_SORT_COLUMNS[sortBy] || "createdAt";
      ({ rows, count } = await Masjid.findAndCountAll({ where, order: [[column, dir]], limit, offset }));
    }

    const ownerIds = [...new Set(rows.map((m) => m.userId))];
    const owners = await User.findAll({ where: { id: ownerIds }, attributes: ["id", "fullName", "email", "mobile"] });
    const ownerById = Object.fromEntries(owners.map((u) => [u.id, u]));

    // One shared-service batch call for the whole page, not one query per
    // row — the same masjidEngagementService every other surface uses.
    const masjidIds = rows.map((m) => m.id);
    const [engagementMap, greenTickMap] = await Promise.all([
      getEngagementForMany(masjidIds),
      getGreenTickBadgeInfoForMany(masjidIds),
    ]);

    const masjids = await Promise.all(
      rows.map(async (m) => {
        const cover = await MasjidPhoto.findOne({ where: { masjidId: m.id, isCover: true } });
        const owner = ownerById[m.userId];
        return {
          ...m.toJSON(),
          otpCode: undefined,
          coverPhotoUrl: cover?.url || null,
          ownerName: owner?.fullName || null,
          ownerEmail: owner?.email || null,
          ownerMobile: owner?.mobile || null,
          ...(engagementMap.get(m.id) || { likeCount: 0, avgRating: 0, reviewCount: 0, likedByMe: false, viewCount: 0 }),
          ...(greenTickMap.get(m.id) || { greenTickStatus: null, verificationId: null, issuedAt: null, isGreenTick: false }),
        };
      })
    );

    const counts = {};
    for (const s of ["draft", "submitted", "under_review", "changes_requested", "approved", "rejected", "inactive", "deleted"]) {
      counts[s] = await Masjid.count({ where: { status: s } });
    }

    res.json({ masjids, total: count, page: Number(page) || 1, pageSize: limit, counts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const [photos, donationAccount, history, contacts, engagement, greenTick] = await Promise.all([
      MasjidPhoto.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] }),
      MasjidDonationAccount.findOne({ where: { masjidId: masjid.id } }),
      MasjidHistory.findAll({ where: { masjidId: masjid.id }, order: [["createdAt", "DESC"]] }),
      MasjidContactPerson.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] }),
      getEngagementFor(masjid.id),
      getGreenTickBadgeInfo(masjid.id),
    ]);

    let donationAccountJson = null;
    if (donationAccount) {
      donationAccountJson = donationAccount.toJSON();
      donationAccountJson.accountNumberMasked = maskAccountNumber(donationAccountJson.accountNumber);
      delete donationAccountJson.accountNumber;
    }

    res.json({
      masjid: { ...masjid.toJSON(), completion: await computeMasjidCompletion(masjid, contacts, photos.length), ...engagement, ...greenTick },
      photos,
      donationAccount: donationAccountJson,
      history,
      contacts: contacts.map((c) => ({ ...c.toJSON(), otpCode: undefined })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin editing is never gated by EDITABLE_STATUSES or ownership — admin
// can update an approved/live masjid's basic info directly (full management
// rights), unlike the owner-facing update() in masjidController.js.
export const updateBasicInfo = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    if (req.body.name !== undefined && !req.body.name?.trim()) {
      return res.status(400).json({ field: "name", message: "Masjid name can't be empty." });
    }

    const changedLabels = [];
    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] === undefined) continue;
      const next = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      if (next !== masjid[field]) changedLabels.push(STRING_FIELD_LABELS[field] || field);
      masjid[field] = next;
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

    const restrictedField = await firstRestrictedField({ name: masjid.name, tagline: masjid.tagline, about: masjid.about });
    if (restrictedField) {
      return res.status(400).json({ field: restrictedField, message: RESTRICTED_CONTENT_MESSAGE });
    }
    const aiFlaggedField = await firstAiFlaggedField({ name: masjid.name, tagline: masjid.tagline, about: masjid.about });
    if (aiFlaggedField) {
      return res.status(400).json({ field: aiFlaggedField, message: RESTRICTED_CONTENT_MESSAGE });
    }

    await masjid.save();
    if (changedLabels.length) await logHistory(masjid.id, "admin_updated_basic_info", `Updated: ${changedLabels.join(", ")}`, req.user.email);

    const [photos, contacts] = await Promise.all([
      MasjidPhoto.count({ where: { masjidId: masjid.id } }),
      MasjidContactPerson.findAll({ where: { masjidId: masjid.id } }),
    ]);
    res.json({ masjid: { ...masjid.toJSON(), completion: await computeMasjidCompletion(masjid, contacts, photos) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const SEO_TITLE_MAX = 70;
const SEO_DESCRIPTION_MAX = 200;

export const updateSeo = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    if (req.body.slug !== undefined) {
      const slug = req.body.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) return res.status(400).json({ field: "slug", message: "URL slug can't be empty." });
      const existing = await Masjid.findOne({ where: { slug, id: { [Op.ne]: masjid.id } } });
      if (existing) return res.status(400).json({ field: "slug", message: "That URL slug is already in use by another masjid." });
      masjid.slug = slug;
    }
    if (req.body.metaTitle !== undefined) {
      const metaTitle = req.body.metaTitle.trim();
      if (metaTitle.length > SEO_TITLE_MAX) return res.status(400).json({ field: "metaTitle", message: `Meta title must be ${SEO_TITLE_MAX} characters or fewer.` });
      masjid.metaTitle = metaTitle || null;
    }
    if (req.body.metaDescription !== undefined) {
      const metaDescription = req.body.metaDescription.trim();
      if (metaDescription.length > SEO_DESCRIPTION_MAX) return res.status(400).json({ field: "metaDescription", message: `Meta description must be ${SEO_DESCRIPTION_MAX} characters or fewer.` });
      masjid.metaDescription = metaDescription || null;
    }

    await masjid.save();
    await logHistory(masjid.id, "admin_updated_seo", null, req.user.email);
    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generates a fresh suggestion but does NOT save it — the admin reviews it
// in the SEO tab's (unsaved) form fields and explicitly saves via
// updateSeo above, same "AI assists, human confirms" shape as this app's
// other AI-assist actions (bio/work-experience suggestions on a profile).
export const suggestSeoMeta = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const seo = await generateSeoMeta({
      name: masjid.name, category: masjid.category, city: masjid.city, country: masjid.country,
      tagline: masjid.tagline, about: masjid.about,
    });
    if (!seo) {
      return res.status(503).json({ message: "AI suggestions aren't available right now — the provider may not be configured, or the request failed. Please fill these in manually." });
    }
    res.json(seo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadPhotos = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });
    if (!req.files?.length) return res.status(400).json({ message: "No photos or videos were uploaded." });

    const oversizedImage = req.files.find((file) => mediaTypeOf(file.mimetype) === "photo" && file.size > IMAGE_MAX_BYTES);
    if (oversizedImage) {
      req.files.forEach((file) => fs.unlink(file.path, () => {}));
      return res.status(400).json({ message: `Photos must be under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB. "${oversizedImage.originalname}" is too large.` });
    }

    const existingCount = await MasjidPhoto.count({ where: { masjidId: masjid.id } });
    const hasCover = existingCount > 0 || (await MasjidPhoto.count({ where: { masjidId: masjid.id, isCover: true } })) > 0;
    let coverAssigned = hasCover;

    const created = await Promise.all(
      req.files.map(async (file, i) => {
        const mediaType = mediaTypeOf(file.mimetype);
        const isCover = !coverAssigned && mediaType === "photo";
        if (isCover) coverAssigned = true;
        let posterUrl = null;
        if (mediaType === "video") {
          const posterFileName = await generateVideoThumbnail(file.path, path.dirname(file.path));
          if (posterFileName) posterUrl = `/uploads/masjid-photos/${posterFileName}`;
        }
        return MasjidPhoto.create({
          masjidId: masjid.id,
          url: `/uploads/masjid-photos/${file.filename}`,
          mediaType,
          posterUrl,
          category: req.body.category || "other",
          isCover,
          sortOrder: existingCount + i,
        });
      })
    );
    await logHistory(masjid.id, "admin_added_photos", `Added ${created.length} photo(s)/video(s)`, req.user.email);
    res.status(201).json({ photos: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePhoto = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });
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
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });
    const photo = await MasjidPhoto.findOne({ where: { id: req.params.photoId, masjidId: masjid.id } });
    if (!photo) return res.status(404).json({ message: "Photo not found." });

    const wasCover = photo.isCover;
    const localPath = `.${photo.url}`;
    const posterLocalPath = photo.posterUrl ? `.${photo.posterUrl}` : null;
    await photo.destroy();
    fs.unlink(localPath, () => {});
    if (posterLocalPath) fs.unlink(posterLocalPath, () => {});

    // The owner-side deletePhoto doesn't reassign a cover when the cover
    // itself is removed — fixed here so the admin path doesn't leave a
    // masjid with photos but no cover image.
    if (wasCover) {
      const next = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, mediaType: { [Op.ne]: "video" } }, order: [["sortOrder", "ASC"]] });
      if (next) {
        next.isCover = true;
        await next.save();
      }
    }
    await logHistory(masjid.id, "admin_removed_photo", null, req.user.email);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approve = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });
    if (!["submitted", "under_review", "changes_requested"].includes(masjid.status)) {
      return res.status(400).json({ message: "Only masjids under review can be approved." });
    }

    masjid.status = "approved";
    masjid.adminFeedback = null;
    masjid.reviewedAt = new Date();
    masjid.approvedAt = new Date();

    // Auto-fill SEO meta on first approval only — never overwrites a value
    // an admin already set by hand via the SEO tab. Best-effort: returns
    // null (no-op) until an AI provider key is configured, or on any
    // failure, so approval itself never blocks on this.
    if (!masjid.metaTitle || !masjid.metaDescription) {
      const seo = await generateSeoMeta({
        name: masjid.name, category: masjid.category, city: masjid.city, country: masjid.country,
        tagline: masjid.tagline, about: masjid.about,
      });
      if (seo) {
        if (!masjid.metaTitle) masjid.metaTitle = seo.metaTitle;
        if (!masjid.metaDescription) masjid.metaDescription = seo.metaDescription;
      }
    }

    await masjid.save();
    await logHistory(masjid.id, "approved", req.body.note, req.user.email);

    const cover = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } });
    await recordMasjidApprovedActivity(masjid, cover?.url || null);

    const owner = await User.findByPk(masjid.userId);
    if (owner) {
      sendMasjidApprovedEmail(masjid, owner).catch(() => {});
      notifyUser({
        userId: owner.id,
        type: "masjid_approved",
        title: "Your masjid is now live",
        body: `"${masjid.name}" has been approved and is now listed.`,
        link: `/account/my-masjids/${masjid.id}`,
        relatedMasjidId: masjid.id,
      }).catch(() => {});
    }

    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reject = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "A rejection reason is required." });

    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    masjid.status = "rejected";
    masjid.adminFeedback = reason.trim();
    masjid.reviewedAt = new Date();
    await masjid.save();
    await logHistory(masjid.id, "rejected", reason.trim(), req.user.email);

    const owner = await User.findByPk(masjid.userId);
    if (owner) {
      sendMasjidRejectedEmail(masjid, owner).catch(() => {});
      notifyUser({
        userId: owner.id,
        type: "masjid_rejected",
        title: "Your masjid was not approved",
        body: `"${masjid.name}" was rejected: ${reason.trim()}`,
        link: `/account/my-masjids/${masjid.id}`,
        relatedMasjidId: masjid.id,
      }).catch(() => {});
    }

    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestChanges = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: "Describe what needs to change." });

    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    masjid.status = "changes_requested";
    masjid.adminFeedback = note.trim();
    masjid.reviewedAt = new Date();
    await masjid.save();
    await logHistory(masjid.id, "changes_requested", note.trim(), req.user.email);

    const owner = await User.findByPk(masjid.userId);
    if (owner) {
      sendMasjidChangesRequestedEmail(masjid, owner).catch(() => {});
      notifyUser({
        userId: owner.id,
        type: "masjid_changes_requested",
        title: "Admin requested changes to your masjid",
        body: `Changes have been requested for "${masjid.name}": ${note.trim()}`,
        link: `/account/my-masjids/${masjid.id}`,
        relatedMasjidId: masjid.id,
      }).catch(() => {});
    }

    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addNote = async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ message: "Note can't be empty." });
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    await logHistory(masjid.id, "note", note.trim(), req.user.email);
    const history = await MasjidHistory.findAll({ where: { masjidId: masjid.id }, order: [["createdAt", "DESC"]] });
    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setActive = async (req, res, active) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    if (active) {
      if (masjid.status !== "inactive") return res.status(400).json({ message: "Only inactive masjids can be reactivated." });
      masjid.status = "approved";
      await logHistory(masjid.id, "activated", null, req.user.email);
    } else {
      if (masjid.status !== "approved") return res.status(400).json({ message: "Only approved masjids can be deactivated." });
      masjid.status = "inactive";
      await logHistory(masjid.id, "deactivated", null, req.user.email);
    }
    await masjid.save();
    res.json({ masjid: masjid.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const activate = (req, res) => setActive(req, res, true);
export const deactivate = (req, res) => setActive(req, res, false);

export const verifyDonationAccount = async (req, res) => {
  try {
    const account = await MasjidDonationAccount.findOne({ where: { masjidId: req.params.id } });
    if (!account) return res.status(404).json({ message: "No donation account on file for this masjid." });
    const verified = req.body.verified !== undefined ? !!req.body.verified : true;
    account.verified = verified;
    await account.save();
    await logHistory(req.params.id, verified ? "donation_account_verified" : "donation_account_unverified", null, req.user.email);
    const json = account.toJSON();
    json.accountNumberMasked = maskAccountNumber(json.accountNumber);
    delete json.accountNumber;
    res.json({ donationAccount: json });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Admin on/off moderation switch for a review — same shape as verifyDonationAccount's toggle. */
export const setReviewVisibility = async (req, res) => {
  try {
    const review = await MasjidReview.findByPk(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found." });
    review.status = req.body.visible === false ? "hidden" : "visible";
    await review.save();
    res.json({ review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// All reviews for one masjid, any status — not visible-only like the public
// endpoint, since an admin needs to see hidden ones too in order to
// moderate them via setReviewVisibility above. The rating summary returned
// alongside is still visible-only, matching what's actually live publicly.
export const listMasjidReviews = async (req, res) => {
  try {
    const masjidId = req.params.id;
    const reviews = await MasjidReview.findAll({ where: { masjidId }, order: [["createdAt", "DESC"]] });
    const [reviewsWithReviewers, engagement, distribution] = await Promise.all([
      withReviewers(reviews, null),
      getEngagementFor(masjidId),
      getRatingDistribution(masjidId),
    ]);
    res.json({ reviews: reviewsWithReviewers, ...engagement, distribution });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Paginated People-Who-Liked, for the admin Engagement tab — admin has
 * full authority so this is never gated on approval status, unlike the
 * public /likers endpoint. Reuses the exact same query shape. */
export const listMasjidLikers = async (req, res) => {
  try {
    const masjid = await Masjid.findByPk(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = 24;
    const { rows, count } = await MasjidFavorite.findAndCountAll({
      where: { masjidId: masjid.id },
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    const users = await User.findAll({ where: { id: rows.map((f) => f.userId) }, attributes: ["id", "fullName", "username", "profilePhoto"] });
    const userById = new Map(users.map((u) => [u.id, u]));
    res.json({
      likers: rows.map((f) => ({ ...userById.get(f.userId)?.toJSON(), likedAt: f.createdAt })).filter((u) => u.id),
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
