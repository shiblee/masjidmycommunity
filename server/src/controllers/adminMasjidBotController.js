import MasjidBotSettings from "../models/MasjidBotSettings.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";
import { checkForDuplicate } from "../services/masjidDuplicateDetectionService.js";
import { searchMosques } from "../services/googlePlacesService.js";

const SETTINGS_FIELDS = [
  "enabled", "masjidsPerHour", "indiaPercent", "activeHourStart", "activeHourEnd",
  "maxMasjidsPerDay", "maxTotalImportedMasjids", "autoPublish", "maxApiCallsPerHour",
];

export const getSettings = async (req, res) => {
  try {
    const settings = await MasjidBotSettings.findByPk(1);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lets an admin (or this build's own verification) check what the
// duplicate-detection stage would decide for a given candidate, without
// spending any Google API calls or writing anything — pure internal logic
// against the real existing Masjid table.
export const checkDuplicate = async (req, res) => {
  try {
    const { name, lat, lng, placeId } = req.body || {};
    const result = await checkForDuplicate({ name, lat: Number(lat), lng: Number(lng), placeId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dry run: real Google Places search + real duplicate check against the
// live Masjid table, but never writes anything — lets this be verified
// end-to-end (including real API spend, which is why it's not the default
// behavior of anything automatic) before the real write pipeline exists.
export const testSearch = async (req, res) => {
  try {
    const { query, lat, lng } = req.body || {};
    if (!query || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ message: "query, lat, and lng are required." });
    }
    const places = await searchMosques({ query, lat: Number(lat), lng: Number(lng) });
    const results = await Promise.all(
      places.map(async (p) => {
        const dup = await checkForDuplicate({
          name: p.displayName?.text,
          lat: p.location?.latitude,
          lng: p.location?.longitude,
          placeId: p.id,
        });
        return {
          placeId: p.id,
          name: p.displayName?.text,
          address: p.formattedAddress,
          types: p.types,
          ...dup,
        };
      })
    );
    res.json({ found: results.length, newCount: results.filter((r) => !r.isDuplicate).length, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await MasjidBotSettings.findByPk(1);
    const actor = await metaActorFrom(req);
    const fields = [];
    for (const field of SETTINGS_FIELDS) {
      if (req.body[field] === undefined) continue;
      fields.push({ field, oldValue: settings[field], newValue: req.body[field] });
      settings[field] = req.body[field];
    }
    await settings.save();
    await recordMetaChange({ entityType: "MasjidBotSettings", entityId: 1, entityName: "Masjid Bot Settings", action: "update", actor, fields }).catch(() => {});
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
