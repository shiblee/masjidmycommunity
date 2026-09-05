import Fuse from "fuse.js";
import { fn, col } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidCategory from "../models/MasjidCategory.js";
import MasjidContactDesignation from "../models/MasjidContactDesignation.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import Bank from "../models/Bank.js";
import DeletionReason from "../models/DeletionReason.js";
import Campaign from "../models/Campaign.js";

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

function baseWhere({ city, country, category }) {
  const where = { status: PUBLIC_STATUS, moderationStatus: "active" };
  if (city) where.city = city;
  if (country) where.country = country;
  if (category) where.category = category;
  return where;
}

/** Ranks `rows` by fuzzy match against `q`, or returns them unranked if `q` is empty. */
function rankByQuery(rows, q) {
  if (!q) return rows;
  const fuse = new Fuse(rows, { keys: FUSE_KEYS, threshold: 0.4, ignoreLocation: true });
  return fuse.search(q).map((r) => r.item);
}

async function withCover(masjid) {
  const cover = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } });
  return { ...masjid.toJSON(), coverPhotoUrl: cover?.url || null };
}

async function withCoverAndCampaigns(masjid) {
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
  return { ...masjid.toJSON(), coverPhotoUrl: cover?.url || null, activeCampaignCount, photoCount, videoCount, imamName: imam?.name || null };
}

export const listPublic = async (req, res) => {
  try {
    const { q, city, country, category, page = 1, pageSize = 12 } = req.query;
    const where = baseWhere({ city, country, category });
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
      masjids = await Promise.all(pageIds.map((id) => withCoverAndCampaigns(byId.get(id))));
    } else {
      const { rows, count } = await Masjid.findAndCountAll({
        where,
        order: [["approvedAt", "DESC"]],
        limit,
        offset: (pageNum - 1) * limit,
      });
      total = count;
      masjids = await Promise.all(rows.map(withCoverAndCampaigns));
    }

    res.json({ masjids, total, page: pageNum, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** Full (unpaginated, capped) point list for Map view — the left panel and markers need the complete filtered set, not one page of it. */
export const listMapPoints = async (req, res) => {
  try {
    const { q, city, country, category } = req.query;
    const where = baseWhere({ city, country, category });
    const rows = await Masjid.findAll({
      where,
      attributes: ["id", "name", "category", "city", "country", "latitude", "longitude", "status"],
    });
    const ranked = rankByQuery(rows, q);
    const truncated = ranked.length > MAP_POINTS_CAP;
    const page = truncated ? ranked.slice(0, MAP_POINTS_CAP) : ranked;
    const masjids = await Promise.all(page.map(withCover));
    res.json({ masjids, truncated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicOne = async (req, res) => {
  try {
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: PUBLIC_STATUS, moderationStatus: "active" } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const photos = await MasjidPhoto.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] });
    // The public profile still shows an "Imam" line — sourced from the
    // office-bearers list now rather than a single column on Masjid.
    const imam = await MasjidContactPerson.findOne({ where: { masjidId: masjid.id, designation: "Imam" } });
    res.json({ masjid: { ...masjid.toJSON(), imamName: imam?.name || null }, photos });
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
    res.json({ categories: categories.map((c) => ({ ...c.toJSON(), count: countByCategory.get(c.name) || 0 })) });
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
