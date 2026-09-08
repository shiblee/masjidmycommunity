import Fuse from "fuse.js";
import { Op, literal } from "sequelize";
import Masjid from "../models/Masjid.js";

// Reuses the exact Haversine SQL pattern and Fuse.js fuzzy-match config
// already proven in publicMasjidController.js's "nearby"/search-ranking
// code — same radius-then-fuzzy-name two-stage approach, just applied at
// import time instead of at search time.
const PROXIMITY_RADIUS_KM = 0.15; // ~150m — tight enough that two distinct
// real mosques are very unlikely to fall within it, per the plan's design.
const NAME_MATCH_THRESHOLD = 0.4;

/**
 * Given a candidate place, decides whether it's already represented by an
 * existing Masjid row. Cheapest, most reliable check first (exact Google
 * Place ID match — Google's own de-dup key), then a location+name fallback
 * for cases where the same real mosque was found without a Place ID or
 * under a different source.
 *
 * Returns { isDuplicate, matchedMasjidId, matchType } where matchType is
 * "placeId" | "proximity_name" | null.
 */
export async function checkForDuplicate({ name, lat, lng, placeId }) {
  if (placeId) {
    const exact = await Masjid.findOne({ where: { placeId }, attributes: ["id"] });
    if (exact) return { isDuplicate: true, matchedMasjidId: exact.id, matchType: "placeId" };
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { isDuplicate: false, matchedMasjidId: null, matchType: null };
  }

  const nearby = await Masjid.findAll({
    where: {
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
      status: { [Op.ne]: "deleted" },
      [Op.and]: [
        literal(
          `(6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(latitude)))) <= ${PROXIMITY_RADIUS_KM}`
        ),
      ],
    },
    attributes: ["id", "name"],
    raw: true,
  });

  if (!nearby.length) return { isDuplicate: false, matchedMasjidId: null, matchType: null };
  if (!name) return { isDuplicate: false, matchedMasjidId: null, matchType: null };

  const fuse = new Fuse(nearby, { keys: ["name"], threshold: NAME_MATCH_THRESHOLD, ignoreLocation: true });
  const match = fuse.search(name)[0];
  if (match) return { isDuplicate: true, matchedMasjidId: match.item.id, matchType: "proximity_name" };

  return { isDuplicate: false, matchedMasjidId: null, matchType: null };
}
