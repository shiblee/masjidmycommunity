import { fn, col } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidReview from "../models/MasjidReview.js";
import User from "../models/User.js";

const BODY_MAX = 2000;
const PAGE_SIZE = 20;

async function withReviewers(reviews) {
  const userIds = [...new Set(reviews.map((r) => r.userId))];
  const users = await User.findAll({ where: { id: userIds }, attributes: ["id", "fullName", "username", "profilePhoto"] });
  const byId = new Map(users.map((u) => [u.id, u]));
  return reviews.map((r) => {
    const user = byId.get(r.userId);
    return {
      ...r.toJSON(),
      reviewer: user ? { fullName: user.fullName, username: user.username, profilePhoto: user.profilePhoto } : null,
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
    res.json({ review });
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
    const body = req.body.body?.trim() || null;
    if (body && body.length > BODY_MAX) {
      return res.status(400).json({ message: `Your review must be ${BODY_MAX} characters or fewer.` });
    }

    const [review] = await MasjidReview.findOrCreate({
      where: { masjidId: masjid.id, userId: req.user.id },
      defaults: { rating, body, status: "visible" },
    });
    review.rating = rating;
    review.body = body;
    review.status = "visible";
    await review.save();

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
