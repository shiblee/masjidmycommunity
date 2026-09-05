import fs from "fs";
import { fn, col } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidReview from "../models/MasjidReview.js";
import ReviewMedia from "../models/ReviewMedia.js";
import ReviewSettings from "../models/ReviewSettings.js";
import User from "../models/User.js";
import { checkRestrictedWords } from "../utils/reviewModeration.js";
import { mediaTypeOf } from "../middleware/upload.js";

// Never expose which term matched or "invalid" jargon — a clear, generic
// message that can't be used to probe the restricted-word library.
const MODERATION_MESSAGE = "Your review contains language that is not permitted. Please remove the inappropriate content and try again.";

const PAGE_SIZE = 20;

async function getReviewSettings() {
  const settings = await ReviewSettings.findByPk(1);
  return {
    maxLength: settings?.maxLength ?? 1000,
    maxImages: settings?.maxImages ?? 5,
    maxVideoSizeMB: settings?.maxVideoSizeMB ?? 50,
    maxVideoDurationSeconds: settings?.maxVideoDurationSeconds ?? 60,
    allowedImageFormats: settings?.allowedImageFormats ?? "jpg,png,webp",
    allowedVideoFormats: settings?.allowedVideoFormats ?? "mp4,webm,mov",
    mediaEnabled: settings?.mediaEnabled ?? true,
    speechToTextEnabled: settings?.speechToTextEnabled ?? true,
  };
}

/** Enforces the admin's configured limits on already-uploaded new files, counted
 * alongside whatever existing media (kept photos/videos) the edit is retaining
 * (multer's own ceiling is a generous absolute safety cap, checked in upload.js). */
function validateReviewMedia(files, settings, keptPhotoCount = 0, keptVideoCount = 0) {
  const photos = files.filter((f) => mediaTypeOf(f.mimetype) === "photo");
  const videos = files.filter((f) => mediaTypeOf(f.mimetype) === "video");

  if (keptPhotoCount + photos.length > settings.maxImages) {
    return { ok: false, message: `You can attach up to ${settings.maxImages} image${settings.maxImages === 1 ? "" : "s"}.` };
  }
  if (keptVideoCount + videos.length > 1) {
    return { ok: false, message: "You can attach only one video per review." };
  }
  const maxVideoBytes = settings.maxVideoSizeMB * 1024 * 1024;
  for (const v of videos) {
    if (v.size > maxVideoBytes) {
      return { ok: false, message: `Video must be under ${settings.maxVideoSizeMB}MB.` };
    }
  }
  return { ok: true };
}

export const getPublicReviewSettings = async (req, res) => {
  try {
    res.json(await getReviewSettings());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function withReviewers(reviews) {
  const userIds = [...new Set(reviews.map((r) => r.userId))];
  const reviewIds = reviews.map((r) => r.id);
  const [users, media] = await Promise.all([
    User.findAll({ where: { id: userIds }, attributes: ["id", "fullName", "username", "profilePhoto"] }),
    ReviewMedia.findAll({ where: { reviewId: reviewIds }, order: [["sortOrder", "ASC"]] }),
  ]);
  const byId = new Map(users.map((u) => [u.id, u]));
  const mediaByReview = new Map();
  media.forEach((m) => {
    const list = mediaByReview.get(m.reviewId) || [];
    list.push(m);
    mediaByReview.set(m.reviewId, list);
  });
  return reviews.map((r) => {
    const user = byId.get(r.userId);
    return {
      ...r.toJSON(),
      reviewer: user ? { fullName: user.fullName, username: user.username, profilePhoto: user.profilePhoto } : null,
      media: mediaByReview.get(r.id) || [],
    };
  });
}

export const listReviews = async (req, res) => {
  try {
    const masjidId = req.params.id;
    const page = Math.max(Number(req.query.page) || 1, 1);

    const [summaryRows, count, rows] = await Promise.all([
      MasjidReview.findAll({
        where: { masjidId, status: "visible" },
        attributes: ["rating", [fn("COUNT", col("id")), "count"]],
        group: ["rating"],
        raw: true,
      }),
      MasjidReview.count({ where: { masjidId, status: "visible" } }),
      MasjidReview.findAll({
        where: { masjidId, status: "visible" },
        order: [["createdAt", "DESC"]],
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    ]);

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;
    summaryRows.forEach((r) => {
      breakdown[r.rating] = Number(r.count);
      ratingSum += r.rating * Number(r.count);
    });
    const average = count > 0 ? ratingSum / count : 0;

    const reviews = await withReviewers(rows);
    res.json({ average, count, breakdown, reviews, page, pageSize: PAGE_SIZE });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyReview = async (req, res) => {
  try {
    const review = await MasjidReview.findOne({ where: { masjidId: req.params.id, userId: req.user.id } });
    if (!review) return res.json({ review: null });
    const media = await ReviewMedia.findAll({ where: { reviewId: review.id }, order: [["sortOrder", "ASC"]] });
    res.json({ review: { ...review.toJSON(), media } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertMyReview = async (req, res) => {
  try {
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: "approved", moderationStatus: "active" } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Please select a rating from 1 to 5 stars." });
    }
    const { maxLength } = await getReviewSettings();
    const body = req.body.body?.trim() || null;
    if (body && body.length > maxLength) {
      return res.status(400).json({ message: `Your review must be ${maxLength} characters or fewer.` });
    }

    if (body) {
      const moderation = await checkRestrictedWords(body);
      if (moderation.flagged) {
        return res.status(400).json({ message: MODERATION_MESSAGE });
      }
    }

    // The client always submits as multipart/form-data (even with zero new
    // files), so req.files is always an array here — new files to add.
    // `keepMediaIds` (a JSON array of existing ReviewMedia ids) tells us
    // which already-uploaded media the user chose to keep; anything not
    // listed there is removed. This is how editing just the rating/text
    // avoids silently wiping existing photos/videos.
    const newFiles = req.files || [];
    let keepIds = [];
    try {
      keepIds = req.body.keepMediaIds ? JSON.parse(req.body.keepMediaIds).map(Number) : [];
    } catch {
      keepIds = [];
    }

    const existingReview = await MasjidReview.findOne({ where: { masjidId: masjid.id, userId: req.user.id } });
    const existingMedia = existingReview ? await ReviewMedia.findAll({ where: { reviewId: existingReview.id } }) : [];
    const kept = existingMedia.filter((m) => keepIds.includes(m.id));
    const keptPhotoCount = kept.filter((m) => m.mediaType === "photo").length;
    const keptVideoCount = kept.filter((m) => m.mediaType === "video").length;

    if (newFiles.length > 0) {
      const settings = await getReviewSettings();
      if (!settings.mediaEnabled) {
        newFiles.forEach((f) => fs.unlink(f.path, () => {}));
        return res.status(400).json({ message: "Media attachments are currently disabled for reviews." });
      }
      const validation = validateReviewMedia(newFiles, settings, keptPhotoCount, keptVideoCount);
      if (!validation.ok) {
        newFiles.forEach((f) => fs.unlink(f.path, () => {}));
        return res.status(400).json({ message: validation.message });
      }
    }

    const [review] = await MasjidReview.findOrCreate({
      where: { masjidId: masjid.id, userId: req.user.id },
      defaults: { rating, body, status: "visible" },
    });
    review.rating = rating;
    review.body = body;
    review.status = "visible";
    await review.save();

    const toRemove = existingMedia.filter((m) => !keepIds.includes(m.id));
    toRemove.forEach((m) => fs.unlink(`.${m.url}`, () => {}));
    if (toRemove.length > 0) await ReviewMedia.destroy({ where: { id: toRemove.map((m) => m.id) } });

    if (newFiles.length > 0) {
      await ReviewMedia.bulkCreate(
        newFiles.map((f, i) => ({
          reviewId: review.id,
          url: `/uploads/review-media/${f.filename}`,
          mediaType: mediaTypeOf(f.mimetype),
          sortOrder: kept.length + i,
        }))
      );
    }

    const [withReviewer] = await withReviewers([review]);
    res.json({ review: withReviewer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMyReview = async (req, res) => {
  try {
    await MasjidReview.destroy({ where: { masjidId: req.params.id, userId: req.user.id } });
    res.json({ message: "Review removed." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
