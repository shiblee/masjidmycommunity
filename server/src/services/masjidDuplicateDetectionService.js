import Fuse from "fuse.js";
import { Op, literal } from "sequelize";
import Masjid from "../models/Masjid.js";

// Reuses the exact Haversine SQL pattern and Fuse.js fuzzy-match config
// already proven in publicMasjidController.js's "nearby"/search-ranking
// code — applied at import time instead of at search time, as two proximity
// tiers rather than one fixed radius:
//   - within TIGHT_RADIUS_KM: treated as a duplicate unconditionally, no
//     name check at all. Verified against real production data that this
//     matters — the exact same coordinates under a differently-worded name
//     ("Lorem Ipsum" vs "Lorem Ipsum Jama Masjid") did NOT fuzzy-match at a
//     normal Fuse.js threshold, which would have let an obvious duplicate
//     through. Two distinct real mosques essentially never share
//     near-identical coordinates, so proximity alone is strong enough
//     evidence here — a missed edge case (two prayer areas in one large
//     complex) is far cheaper than the duplicate-directory-entries this
//     bot exists to prevent.
//   - between TIGHT_RADIUS_KM and WIDE_RADIUS_KM: only a duplicate if the
//     name also fuzzy-matches (looser threshold) — for same-mosque-
//     different-address-precision cases without collapsing genuinely
//     separate nearby mosques into one.
const TIGHT_RADIUS_KM = 0.1; // ~100m
const WIDE_RADIUS_KM = 0.5; // ~500m
const NAME_MATCH_THRESHOLD = 0.5;

async function findNearby(lat, lng, radiusKm) {
  return Masjid.findAll({
    where: {
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null },
      status: { [Op.ne]: "deleted" },
      [Op.and]: [
        literal(
          `(6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(latitude)))) <= ${radiusKm}`
        ),
      ],
    },
    attributes: ["id", "name"],
    raw: true,
  });
}

/**
 * Given a candidate place, decides whether it's already represented by an
 * existing Masjid row. Cheapest, most reliable check first (exact Google
 * Place ID match — Google's own de-dup key), then a two-tier location
 * check for cases where the same real mosque was found without a Place ID
 * or under a different source/name.
 *
 * Returns { isDuplicate, matchedMasjidId, matchType } where matchType is
 * "placeId" | "proximity" | "proximity_name" | null.
 */
export async function checkForDuplicate({ name, lat, lng, placeId }) {
  if (placeId) {
    const exact = await Masjid.findOne({ where: { placeId }, attributes: ["id"] });
    if (exact) return { isDuplicate: true, matchedMasjidId: exact.id, matchType: "placeId" };
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { isDuplicate: false, matchedMasjidId: null, matchType: null };
  }

  const veryClose = await findNearby(lat, lng, TIGHT_RADIUS_KM);
  if (veryClose.length) return { isDuplicate: true, matchedMasjidId: veryClose[0].id, matchType: "proximity" };

  if (!name) return { isDuplicate: false, matchedMasjidId: null, matchType: null };

  const nearby = await findNearby(lat, lng, WIDE_RADIUS_KM);
  if (!nearby.length) return { isDuplicate: false, matchedMasjidId: null, matchType: null };

  const fuse = new Fuse(nearby, { keys: ["name"], threshold: NAME_MATCH_THRESHOLD, ignoreLocation: true });
  const match = fuse.search(name)[0];
  if (match) return { isDuplicate: true, matchedMasjidId: match.item.id, matchType: "proximity_name" };

  return { isDuplicate: false, matchedMasjidId: null, matchType: null };
}
