import Fuse from "fuse.js";
import { fn, col, literal, Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidCategory from "../models/MasjidCategory.js";
import MasjidContactDesignation from "../models/MasjidContactDesignation.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import Bank from "../models/Bank.js";
import DeletionReason from "../models/DeletionReason.js";
import Campaign from "../models/Campaign.js";
import MasjidReview from "../models/MasjidReview.js";
import MasjidFavorite from "../models/MasjidFavorite.js";
import User from "../models/User.js";
import MapSettings from "../models/MapSettings.js";
import { getEffectivePrayerTimes, isValidDateStr } from "../services/prayerTimeService.js";
import { getEngagementFor, getEngagementForMany } from "../services/masjidEngagementService.js";
import { getGreenTickBadgeInfo, getGreenTickBadgeInfoForMany } from "../services/greenTickService.js";
import GreenTickApplication from "../models/GreenTickApplication.js";

const PUBLIC_STATUS = "approved";
const MAP_POINTS_CAP = 500;

const FUSE_KEYS = [
  { name: "name", weight: 3 },
  "tagline",
  "about",
  "category",
  "city",
  "area",
  "district",
  "state",
  "country",
];

const NEARBY_RADIUS_KM = 25;

async function activeMasjidIds() {
  const rows = await Campaign.findAll({ where: { status: "active" }, attributes: ["masjidId"], group: ["masjidId"], raw: true });
  return rows.map((r) => r.masjidId);
}

/** `activeOnly`/`lat`+`lng` are async-derived (need a DB lookup / SQL fragment), so
 * callers build the rest of the filters first and pass this pre-resolved. */
async function baseWhere({ city, country, category, activeOnly, lat, lng }) {
  const where = { status: PUBLIC_STATUS, moderationStatus: "active" };
  if (city) where.city = city;
  if (country) where.country = country;
  // `category` may be a single name or a comma-joined list — a masjid
  // matches if its category is ANY of the selected ones (OR, not AND).
  const categories = (category || "").split(",").map((c) => c.trim()).filter(Boolean);
  if (categories.length === 1) where.category = categories[0];
  else if (categories.length > 1) where.category = { [Op.in]: categories };
  if (activeOnly) where.id = { [Op.in]: await activeMasjidIds() };

  const latNum = Number(lat), lngNum = Number(lng);
  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    where.latitude = { [Op.ne]: null };
    where.longitude = { [Op.ne]: null };
    where[Op.and] = [
      literal(
        `(6371 * acos(cos(radians(${latNum})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lngNum})) + sin(radians(${latNum})) * sin(radians(latitude)))) <= ${NEARBY_RADIUS_KM}`
      ),
    ];
  }
  return where;
}

/** Ranks `rows` by fuzzy match against `q`, or returns them unranked if `q` is empty. */
function rankByQuery(rows, q) {
  if (!q) return rows;
  const fuse = new Fuse(rows, { keys: FUSE_KEYS, threshold: 0.4, ignoreLocation: true });
  return fuse.search(q).map((r) => r.item);
}

async function withCover(masjid, engagement) {
  const [cover, photoCount] = await Promise.all([
    MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } }),
    MasjidPhoto.count({ where: { masjidId: masjid.id, mediaType: "photo" } }),
  ]);
  return { ...masjid.toJSON(), coverPhotoUrl: cover?.url || null, photoCount, ...engagement };
}

async function withCoverAndCampaigns(masjid, engagement) {
  const [cover, activeCampaignCount, mediaCounts, imam] = await Promise.all([
    MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } }),
    Campaign.count({ where: { masjidId: masjid.id, status: "active" } }),
    MasjidPhoto.findAll({
      where: { masjidId: masjid.id },
      attributes: ["mediaType", [fn("COUNT", col("id")), "count"]],
      group: ["mediaType"],
      raw: true,
    }),
    MasjidContactPerson.findOne({ where: { masjidId: masjid.id, designation: "Imam" } }),
  ]);
  const photoCount = Number(mediaCounts.find((r) => r.mediaType === "photo")?.count || 0);
  const videoCount = Number(mediaCounts.find((r) => r.mediaType === "video")?.count || 0);
  return { ...masjid.toJSON(), coverPhotoUrl: cover?.url || null, activeCampaignCount, photoCount, videoCount, imamName: imam?.name || null, ...engagement };
}

export const listPublic = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { q, city, country, category, activeOnly, lat, lng, page = 1, pageSize = 12 } = req.query;
    const where = await baseWhere({ city, country, category, activeOnly, lat, lng });
    const limit = Math.min(Number(pageSize) || 12, 48);
    const pageNum = Math.max(Number(page) || 1, 1);

    let masjids, total;
    if (q) {
      const allMatching = await Masjid.findAll({ where });
      const ranked = rankByQuery(allMatching, q);
      total = ranked.length;
      const pageIds = ranked.slice((pageNum - 1) * limit, pageNum * limit).map((m) => m.id);
      const rows = await Masjid.findAll({ where: { id: pageIds } });
      const byId = new Map(rows.map((r) => [r.id, r]));
      const [engagementMap, greenTickMap] = await Promise.all([
        getEngagementForMany(pageIds, userId),
        getGreenTickBadgeInfoForMany(pageIds),
      ]);
      masjids = await Promise.all(pageIds.map((id) => withCoverAndCampaigns(byId.get(id), { ...engagementMap.get(id), ...greenTickMap.get(id) })));
    } else {
      const { rows, count } = await Masjid.findAndCountAll({
        where,
        order: [["approvedAt", "DESC"]],
        limit,
        offset: (pageNum - 1) * limit,
      });
      total = count;
      const ids = rows.map((r) => r.id);
      const [engagementMap, greenTickMap] = await Promise.all([
        getEngagementForMany(ids, userId),
        getGreenTickBadgeInfoForMany(ids),
      ]);
      masjids = await Promise.all(rows.map((m) => withCoverAndCampaigns(m, { ...engagementMap.get(m.id), ...greenTickMap.get(m.id) })));
    }

    res.json({ masjids, total, page: pageNum, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Full (unpaginated, capped) point list for Map view — the left panel and markers need the complete filtered set, not one page of it. */
export const listMapPoints = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { q, city, country, category, activeOnly, lat, lng } = req.query;
    const where = await baseWhere({ city, country, category, activeOnly, lat, lng });
    const rows = await Masjid.findAll({
      where,
      attributes: ["id", "name", "category", "city", "country", "latitude", "longitude", "status"],
    });
    const ranked = rankByQuery(rows, q);
    const truncated = ranked.length > MAP_POINTS_CAP;
    const page = truncated ? ranked.slice(0, MAP_POINTS_CAP) : ranked;
    const ids = page.map((r) => r.id);
    const [engagementMap, greenTickMap] = await Promise.all([
      getEngagementForMany(ids, userId),
      getGreenTickBadgeInfoForMany(ids),
    ]);
    const masjids = await Promise.all(page.map((m) => withCover(m, { ...engagementMap.get(m.id), ...greenTickMap.get(m.id) })));
    res.json({ masjids, truncated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicOne = async (req, res) => {
  try {
    const userId = req.user?.id;
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: PUBLIC_STATUS, moderationStatus: "active" } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const [photos, imam, topLikerFavorites, engagement, greenTick, campaignCount] = await Promise.all([
      MasjidPhoto.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] }),
      // The public profile still shows an "Imam" line — sourced from the
      // office-bearers list now rather than a single column on Masjid.
      MasjidContactPerson.findOne({ where: { masjidId: masjid.id, designation: "Imam" } }),
      MasjidFavorite.findAll({ where: { masjidId: masjid.id }, order: [["createdAt", "DESC"]], limit: 6 }),
      getEngagementFor(masjid.id, userId),
      getGreenTickBadgeInfo(masjid.id),
      Campaign.count({ where: { masjidId: masjid.id, status: "active" } }),
    ]);
    const topLikerUsers = await User.findAll({
      where: { id: topLikerFavorites.map((f) => f.userId) },
      attributes: ["id", "fullName", "profilePhoto"],
    });
    const userById = new Map(topLikerUsers.map((u) => [u.id, u]));
    const topLikers = topLikerFavorites.map((f) => userById.get(f.userId)).filter(Boolean);
    const photoCount = photos.filter((p) => p.mediaType === "photo").length;
    const videoCount = photos.filter((p) => p.mediaType === "video").length;

    res.json({
      masjid: {
        ...masjid.toJSON(),
        imamName: imam?.name || null,
        topLikers,
        ...engagement,
        ...greenTick,
        campaignCount,
        photoCount,
        videoCount,
      },
      photos,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Paginated list of users who liked a masjid — for the People tab. Only
 * plain public fields are exposed (no email/mobile); this app has no
 * privacy-settings system, so this is the same visibility level review
 * author names already get elsewhere. */
export const listLikers = async (req, res) => {
  try {
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: PUBLIC_STATUS, moderationStatus: "active" } });
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
      likers: rows.map((f) => userById.get(f.userId)).filter(Boolean),
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** The current user's liked masjids, most-recently-liked first — powers
 * the Liked Masjids page. Filters out any masjid that's no longer public
 * (e.g. deactivated after being liked) before paginating, so `total` always
 * matches what's actually shown. */
export const listMyLiked = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.pageSize) || 12, 48);

    const favorites = await MasjidFavorite.findAll({ where: { userId }, order: [["createdAt", "DESC"]] });
    const masjids = favorites.length
      ? await Masjid.findAll({ where: { id: favorites.map((f) => f.masjidId), status: PUBLIC_STATUS, moderationStatus: "active" } })
      : [];
    const byId = new Map(masjids.map((m) => [m.id, m]));
    const ordered = favorites.map((f) => byId.get(f.masjidId)).filter(Boolean);

    const total = ordered.length;
    const pageRows = ordered.slice((page - 1) * limit, page * limit);
    const ids = pageRows.map((m) => m.id);
    const [engagementMap, greenTickMap] = await Promise.all([
      getEngagementForMany(ids, userId),
      getGreenTickBadgeInfoForMany(ids),
    ]);
    const cards = await Promise.all(pageRows.map((m) => withCoverAndCampaigns(m, { ...engagementMap.get(m.id), ...greenTickMap.get(m.id) })));

    res.json({ masjids: cards, total, page, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Community members (office bearers — Imam, Mutawalli, Secretary, and any
// others the masjid has added) shown publicly on the Explore modal's About
// tab. Only OTP-verified contacts are returned — an unverified name/number
// hasn't been confirmed as real yet and shouldn't be published.
export const listPublicContacts = async (req, res) => {
  try {
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: PUBLIC_STATUS, moderationStatus: "active" } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const contacts = await MasjidContactPerson.findAll({
      where: { masjidId: masjid.id, verified: true },
      attributes: ["id", "designation", "name", "mobile"],
      order: [["sortOrder", "ASC"]],
    });
    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Read-only, unauthenticated — the same override -> recurring -> none
 * priority as the owner/admin surfaces, computed by the same shared
 * service, so a masjid's public prayer times always match what its owner
 * (or an admin) actually set. */
export const getPublicPrayerTimes = async (req, res) => {
  try {
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: PUBLIC_STATUS, moderationStatus: "active" } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
    if (!isValidDateStr(dateStr)) return res.status(400).json({ message: "Invalid date." });

    const roster = await getEffectivePrayerTimes(masjid.id, dateStr);
    res.json({ date: dateStr, roster: roster.filter((r) => r.time) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Public Green Tick lookup — deliberately the minimum needed to establish
 * verification (masjid identity + status + when), never documents or
 * representative details, per the spec's security section. Works for any
 * status a verification ID was ever generated for (not just currently
 * issued), so a suspended/revoked certificate's QR code still resolves to
 * an honest "not currently valid" answer instead of a dead link.
 */
export const verifyGreenTick = async (req, res) => {
  try {
    const application = await GreenTickApplication.findOne({ where: { verificationId: req.params.verificationId } });
    if (!application) return res.status(404).json({ message: "No masjid found with this verification ID." });

    const masjid = await Masjid.findByPk(application.masjidId, { attributes: ["id", "name", "category", "city", "country"] });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    res.json({
      verificationId: application.verificationId,
      status: application.status,
      isGreenTick: application.status === "green_tick_issued",
      issuedAt: application.issuedAt,
      masjid: { id: masjid.id, name: masjid.name, category: masjid.category, city: masjid.city, country: masjid.country },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Every approved masjid, sorted by distance from the one being viewed
 * (nearest first) — powers the Masjid Hub's left-side discovery panel.
 * The masjid being viewed is included (distanceKm: 0) so it can be shown
 * with an active/highlighted state, matching the panel's own selection.
 * Masjids with no coordinates sort last (distance can't be computed) and
 * report `distanceKm: null` rather than a fabricated number. */
export const listNearbyAll = async (req, res) => {
  try {
    const userId = req.user?.id;
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: PUBLIC_STATUS, moderationStatus: "active" } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const q = (req.query.q || "").trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(Number(req.query.pageSize) || 20, 50);

    const where = { status: PUBLIC_STATUS, moderationStatus: "active" };
    if (q) where.name = { [Op.like]: `%${q}%` };

    const hasCoords = masjid.latitude != null && masjid.longitude != null;
    const attributes = ["id", "name", "category", "city", "country", "latitude", "longitude"];
    let order;
    if (hasCoords) {
      const distanceExpr = literal(
        `(6371 * acos(cos(radians(${masjid.latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${masjid.longitude})) + sin(radians(${masjid.latitude})) * sin(radians(latitude))))`
      );
      attributes.push([distanceExpr, "distanceKm"]);
      order = [[literal("latitude IS NULL OR longitude IS NULL"), "ASC"], [literal("distanceKm"), "ASC"]];
    } else {
      attributes.push([literal("NULL"), "distanceKm"]);
      order = [["approvedAt", "DESC"]];
    }

    const { rows, count } = await Masjid.findAndCountAll({
      where,
      attributes,
      order,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    const masjidIds = rows.map((r) => r.id);
    const [covers, engagementMap, greenTickMap] = await Promise.all([
      MasjidPhoto.findAll({ where: { masjidId: masjidIds, isCover: true } }),
      getEngagementForMany(masjidIds, userId),
      getGreenTickBadgeInfoForMany(masjidIds),
    ]);
    const coverByMasjid = new Map(covers.map((c) => [c.masjidId, c.url]));

    res.json({
      masjids: rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        city: r.city,
        country: r.country,
        coverPhotoUrl: coverByMasjid.get(r.id) || null,
        distanceKm: r.get("distanceKm") != null ? Number(r.get("distanceKm")) : null,
        ...(engagementMap.get(r.id) || { likeCount: 0, avgRating: 0, reviewCount: 0, likedByMe: false }),
        ...(greenTickMap.get(r.id) || { greenTickStatus: null, verificationId: null, issuedAt: null, isGreenTick: false }),
      })),
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Directory-wide (unfiltered) counts for the discovery summary bar. */
export const listStats = async (req, res) => {
  try {
    const where = { status: PUBLIC_STATUS, moderationStatus: "active" };
    const [totalMasjids, cityRows] = await Promise.all([
      Masjid.count({ where }),
      Masjid.findAll({ where, attributes: ["id", "city"], raw: true }),
    ]);
    const citiesCovered = new Set(cityRows.map((r) => r.city).filter(Boolean)).size;
    const activeCampaigns = await Campaign.count({ where: { status: "active", masjidId: cityRows.map((r) => r.id) } });
    res.json({ totalMasjids, citiesCovered, activeCampaigns });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listCategories = async (req, res) => {
  try {
    const [categories, counts] = await Promise.all([
      MasjidCategory.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name"] }),
      Masjid.findAll({
        where: { status: PUBLIC_STATUS, moderationStatus: "active" },
        attributes: ["category", [fn("COUNT", col("id")), "count"]],
        group: ["category"],
        raw: true,
      }),
    ]);
    const countByCategory = new Map(counts.map((r) => [r.category, Number(r.count)]));
    // "Other" is a catch-all, not a real category — it always sorts last in
    // the public filter regardless of the admin's configured sortOrder.
    const ordered = [...categories].sort((a, b) => {
      const aOther = a.name.trim().toLowerCase() === "other";
      const bOther = b.name.trim().toLowerCase() === "other";
      if (aOther !== bOther) return aOther ? 1 : -1;
      return 0;
    });
    res.json({ categories: ordered.map((c) => ({ ...c.toJSON(), count: countByCategory.get(c.name) || 0 })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listContactDesignations = async (req, res) => {
  try {
    const designations = await MasjidContactDesignation.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"]],
      attributes: ["id", "name", "isRequired"],
    });
    res.json({ designations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listBanks = async (req, res) => {
  try {
    const banks = await Bank.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name"] });
    res.json({ banks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listDeletionReasons = async (req, res) => {
  try {
    const reasons = await DeletionReason.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name"] });
    res.json({ reasons });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const value = row[field];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

export const listFilters = async (req, res) => {
  try {
    const rows = await Masjid.findAll({ where: { status: PUBLIC_STATUS, moderationStatus: "active" }, attributes: ["city", "country"], raw: true });
    res.json({ cities: countBy(rows, "city"), countries: countBy(rows, "country") });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Feeds the address-autocomplete widget (Google Maps API key + country
// bias) — admin-configurable via Settings, with the client falling back to
// its own build-time env vars if this returns blank values. Publicly
// readable by design: a browser-side Maps key is not a secret (see
// MapSettings.js) — only the admin PATCH endpoint is protected.
export const getMapSettings = async (req, res) => {
  try {
    const settings = await MapSettings.findByPk(1);
    res.json({
      googleMapsApiKey: settings?.googleMapsApiKey || "",
      addressCountry: settings?.addressCountry || "",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
