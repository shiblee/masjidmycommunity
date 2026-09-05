import MasjidReview from "../models/MasjidReview.js";
import ReviewMedia from "../models/ReviewMedia.js";
import Masjid from "../models/Masjid.js";
import User from "../models/User.js";

export const listPending = async (req, res) => {
  try {
    const reviews = await MasjidReview.findAll({ where: { status: "pending" }, order: [["createdAt", "ASC"]] });
    const masjidIds = [...new Set(reviews.map((r) => r.masjidId))];
    const userIds = [...new Set(reviews.map((r) => r.userId))];
    const reviewIds = reviews.map((r) => r.id);
    const [masjids, users, media] = await Promise.all([
      Masjid.findAll({ where: { id: masjidIds }, attributes: ["id", "name"] }),
      User.findAll({ where: { id: userIds }, attributes: ["id", "fullName", "username"] }),
      ReviewMedia.findAll({ where: { reviewId: reviewIds }, order: [["sortOrder", "ASC"]] }),
    ]);
    const masjidById = new Map(masjids.map((m) => [m.id, m]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const mediaByReview = new Map();
    media.forEach((m) => {
      const list = mediaByReview.get(m.reviewId) || [];
      list.push(m);
      mediaByReview.set(m.reviewId, list);
    });

    res.json({
      reviews: reviews.map((r) => ({
        ...r.toJSON(),
        masjid: masjidById.get(r.masjidId) ? { id: r.masjidId, name: masjidById.get(r.masjidId).name } : null,
        reviewer: userById.get(r.userId) ? { fullName: userById.get(r.userId).fullName, username: userById.get(r.userId).username } : null,
        media: mediaByReview.get(r.id) || [],
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const actOnReview = async (req, res) => {
  try {
    const { action } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'approve' or 'reject'." });
    }
    const review = await MasjidReview.findOne({ where: { id: req.params.id, status: "pending" } });
    if (!review) return res.status(404).json({ message: "Pending review not found." });

    review.status = action === "approve" ? "visible" : "hidden";
    review.flagReason = null;
    await review.save();
    res.json({ review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
