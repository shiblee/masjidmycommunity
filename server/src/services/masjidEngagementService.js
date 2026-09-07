import { fn, col } from "sequelize";
import MasjidFavorite from "../models/MasjidFavorite.js";
import MasjidReview from "../models/MasjidReview.js";
import MasjidView from "../models/MasjidView.js";

// The single source of truth for a Masjid's Like/Rating/Review/View numbers —
// every surface that displays a masjid (Grid/List/Map, detail page, My
// Masjid, Nearby, Liked Masjids, Admin Panel) reads through this module so
// "like it from Grid View" is immediately reflected everywhere else, per
// the "One Masjid -> One Like Count -> One Rating -> One Review System"
// requirement. Only ever counts visible reviews — hidden/pending ones never
// affect the public-facing average or count.

/** One masjid's engagement numbers. `userId` is optional — pass it to also
 * learn whether THAT user has liked this masjid (`likedByMe`); omit it
 * (e.g. for admin surfaces) and `likedByMe` is always false. */
export async function getEngagementFor(masjidId, userId) {
  const [likeCount, ratingRows, likedByMe, viewCount] = await Promise.all([
    MasjidFavorite.count({ where: { masjidId } }),
    MasjidReview.findAll({
      where: { masjidId, status: "visible" },
      attributes: [[fn("AVG", col("rating")), "avg"], [fn("COUNT", col("id")), "count"]],
      raw: true,
    }),
    userId ? MasjidFavorite.findOne({ where: { masjidId, userId } }) : null,
    MasjidView.count({ where: { masjidId } }),
  ]);
  const reviewCount = Number(ratingRows[0]?.count || 0);
  return {
    likeCount,
    avgRating: reviewCount > 0 ? Number(ratingRows[0].avg) : 0,
    reviewCount,
    likedByMe: !!likedByMe,
    viewCount,
  };
}

/** Batch version for list surfaces — 2-3 grouped queries total for the
 * whole page, never one query per row. Returns a Map keyed by masjidId;
 * every id in `masjidIds` is guaranteed a (possibly all-zero) entry. */
export async function getEngagementForMany(masjidIds, userId) {
  const result = new Map();
  if (!masjidIds.length) return result;

  const [likeRows, ratingRows, likedRows, viewRows] = await Promise.all([
    MasjidFavorite.findAll({
      where: { masjidId: masjidIds },
      attributes: ["masjidId", [fn("COUNT", col("id")), "count"]],
      group: ["masjidId"],
      raw: true,
    }),
    MasjidReview.findAll({
      where: { masjidId: masjidIds, status: "visible" },
      attributes: ["masjidId", [fn("AVG", col("rating")), "avg"], [fn("COUNT", col("id")), "count"]],
      group: ["masjidId"],
      raw: true,
    }),
    userId
      ? MasjidFavorite.findAll({ where: { masjidId: masjidIds, userId }, attributes: ["masjidId"], raw: true })
      : [],
    MasjidView.findAll({
      where: { masjidId: masjidIds },
      attributes: ["masjidId", [fn("COUNT", col("id")), "count"]],
      group: ["masjidId"],
      raw: true,
    }),
  ]);

  const likeByMasjid = new Map(likeRows.map((r) => [r.masjidId, Number(r.count)]));
  const ratingByMasjid = new Map(ratingRows.map((r) => [r.masjidId, { avgRating: Number(r.avg), reviewCount: Number(r.count) }]));
  const likedSet = new Set(likedRows.map((r) => r.masjidId));
  const viewByMasjid = new Map(viewRows.map((r) => [r.masjidId, Number(r.count)]));

  for (const id of masjidIds) {
    result.set(id, {
      likeCount: likeByMasjid.get(id) || 0,
      avgRating: ratingByMasjid.get(id)?.avgRating || 0,
      reviewCount: ratingByMasjid.get(id)?.reviewCount || 0,
      likedByMe: likedSet.has(id),
      viewCount: viewByMasjid.get(id) || 0,
    });
  }
  return result;
}

/** Star-by-star breakdown (5..1) of visible reviews — powers rating-distribution bars. */
export async function getRatingDistribution(masjidId) {
  const rows = await MasjidReview.findAll({
    where: { masjidId, status: "visible" },
    attributes: ["rating", [fn("COUNT", col("id")), "count"]],
    group: ["rating"],
    raw: true,
  });
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  rows.forEach((r) => { breakdown[r.rating] = Number(r.count); });
  return breakdown;
}
