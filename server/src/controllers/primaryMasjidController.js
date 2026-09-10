import { literal } from "sequelize";
import User from "../models/User.js";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import { PRIMARY_MASJID_REMINDER_DAYS, NEARBY_MASJID_LIMIT } from "../config/primaryMasjidDefaults.js";

const PUBLIC_STATUS = "approved";

async function coverPhotoUrl(masjidId) {
  const cover = await MasjidPhoto.findOne({ where: { masjidId, isCover: true } });
  return cover?.url || null;
}

function serializeMasjidCard(m) {
  return {
    id: m.id,
    name: m.name,
    city: m.city,
    country: m.country,
    formattedAddress: m.formattedAddress,
    distanceKm: m.get ? m.get("distanceKm") ?? null : null,
  };
}

// GET /users/me/primary-masjid-status — the gate PrimaryMasjidPrompt.jsx
// checks on every page load for a logged-in user. `shouldPrompt` is the
// server-computed reminder-interval rule (see primaryMasjidDefaults.js) so
// the client never has to reimplement the timing logic itself.
export const getStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ["id", "primaryMasjidId", "primaryMasjidPromptSkippedAt"] });
    if (!user) return res.status(404).json({ message: "User not found." });

    let primaryMasjid = null;
    if (user.primaryMasjidId) {
      const masjid = await Masjid.findOne({ where: { id: user.primaryMasjidId, status: PUBLIC_STATUS } });
      if (masjid) {
        primaryMasjid = { ...serializeMasjidCard(masjid), coverPhotoUrl: await coverPhotoUrl(masjid.id) };
      }
      // If the masjid is no longer public (e.g. deleted/unpublished since
      // being picked), fall through — hasPrimary/shouldPrompt below treat
      // this exactly like "no primary masjid" so the picker can be shown again.
    }

    const hasPrimary = !!primaryMasjid;
    let shouldPrompt = !hasPrimary;
    if (!hasPrimary && user.primaryMasjidPromptSkippedAt) {
      const daysSinceSkip = (Date.now() - new Date(user.primaryMasjidPromptSkippedAt).getTime()) / (1000 * 60 * 60 * 24);
      shouldPrompt = daysSinceSkip >= PRIMARY_MASJID_REMINDER_DAYS;
    }

    res.json({ hasPrimary, shouldPrompt, primaryMasjid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /users/me/nearby-masjids?lat=&lng= — powers both the popup and the
// profile page's "Change Primary Masjid" picker. Same haversine-by-lat/lng
// pattern as publicMasjidController.js's listNearbyAll, just centered on
// the viewer's own location instead of another masjid's. Falls back to the
// user's saved profile location, then to a plain (undistanced) list, rather
// than ever erroring — the picker should always have something to show.
export const listNearby = async (req, res) => {
  try {
    let lat = Number(req.query.lat);
    let lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const user = await User.findByPk(req.user.id, { attributes: ["locationLat", "locationLng"] });
      lat = user?.locationLat;
      lng = user?.locationLng;
    }

    const where = { status: PUBLIC_STATUS, moderationStatus: "active" };
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const attributes = ["id", "name", "city", "country", "formattedAddress"];
    let order;
    if (hasCoords) {
      const distanceExpr = literal(
        `(6371 * acos(cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lng})) + sin(radians(${lat})) * sin(radians(latitude))))`
      );
      attributes.push([distanceExpr, "distanceKm"]);
      order = [[literal("latitude IS NULL OR longitude IS NULL"), "ASC"], [literal("distanceKm"), "ASC"]];
    } else {
      attributes.push([literal("NULL"), "distanceKm"]);
      order = [["approvedAt", "DESC"]];
    }

    const masjids = await Masjid.findAll({ where, attributes, order, limit: NEARBY_MASJID_LIMIT });
    const cards = await Promise.all(
      masjids.map(async (m) => ({ ...serializeMasjidCard(m), coverPhotoUrl: await coverPhotoUrl(m.id) }))
    );

    res.json({ masjids: cards, locationSource: hasCoords ? "known" : "unknown" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /users/me/primary-masjid { masjidId }
export const setPrimary = async (req, res) => {
  try {
    const { masjidId } = req.body;
    const masjid = await Masjid.findOne({ where: { id: masjidId, status: PUBLIC_STATUS } });
    if (!masjid) return res.status(400).json({ message: "That masjid isn't available to select." });

    const user = await User.findByPk(req.user.id);
    // "Only one at a time" is automatic — a single nullable column, so
    // setting a new value always fully replaces whatever was there before.
    user.primaryMasjidId = masjid.id;
    user.primaryMasjidPromptSkippedAt = null;
    await user.save();

    res.json({ primaryMasjid: { ...serializeMasjidCard(masjid), coverPhotoUrl: await coverPhotoUrl(masjid.id) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /users/me/primary-masjid/skip
export const skipPrompt = async (req, res) => {
  try {
    await User.update({ primaryMasjidPromptSkippedAt: new Date() }, { where: { id: req.user.id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
