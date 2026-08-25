import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidCategory from "../models/MasjidCategory.js";

const PUBLIC_STATUS = "approved";

async function withCover(masjid) {
  const cover = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } });
  return { ...masjid.toJSON(), coverPhotoUrl: cover?.url || null };
}

export const listPublic = async (req, res) => {
  try {
    const { q, city, country, page = 1, pageSize = 12 } = req.query;
    const where = { status: PUBLIC_STATUS };
    if (city) where.city = city;
    if (country) where.country = country;
    if (q) {
      where[Op.or] = [{ name: { [Op.like]: `%${q}%` } }, { city: { [Op.like]: `%${q}%` } }, { country: { [Op.like]: `%${q}%` } }];
    }

    const limit = Math.min(Number(pageSize) || 12, 48);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await Masjid.findAndCountAll({ where, order: [["approvedAt", "DESC"]], limit, offset });
    const masjids = await Promise.all(rows.map(withCover));

    res.json({ masjids, total: count, page: Number(page) || 1, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPublicOne = async (req, res) => {
  try {
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: PUBLIC_STATUS } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const photos = await MasjidPhoto.findAll({ where: { masjidId: masjid.id }, order: [["sortOrder", "ASC"]] });
    res.json({ masjid: masjid.toJSON(), photos });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listCategories = async (req, res) => {
  try {
    const categories = await MasjidCategory.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name"] });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listFilters = async (req, res) => {
  try {
    const rows = await Masjid.findAll({ where: { status: PUBLIC_STATUS }, attributes: ["city", "country"] });
    const cities = [...new Set(rows.map((r) => r.city).filter(Boolean))].sort();
    const countries = [...new Set(rows.map((r) => r.country).filter(Boolean))].sort();
    res.json({ cities, countries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
