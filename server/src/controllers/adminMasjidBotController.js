import MasjidBotSettings from "../models/MasjidBotSettings.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";
import { checkForDuplicate } from "../services/masjidDuplicateDetectionService.js";

const SETTINGS_FIELDS = [
  "enabled", "masjidsPerHour", "indiaPercent", "activeHourStart", "activeHourEnd",
  "maxMasjidsPerDay", "maxTotalImportedMasjids", "autoPublish", "placesApiServerKey", "maxApiCallsPerHour",
];

// The secret server key is write-only from the client's point of view —
// GET never echoes the real value back, only whether one is set, so it
// can't leak through the admin API response the way MapSettings'
// intentionally-public browser key does.
function serializeSettings(settings) {
  const json = settings.toJSON();
  const hasKey = !!json.placesApiServerKey;
  delete json.placesApiServerKey;
  return { ...json, placesApiServerKeySet: hasKey };
}

export const getSettings = async (req, res) => {
  try {
    const settings = await MasjidBotSettings.findByPk(1);
    res.json(serializeSettings(settings));
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

export const updateSettings = async (req, res) => {
  try {
    const settings = await MasjidBotSettings.findByPk(1);
    const actor = await metaActorFrom(req);
    const fields = [];
    for (const field of SETTINGS_FIELDS) {
      if (req.body[field] === undefined) continue;
      const oldValue = field === "placesApiServerKey" ? (settings[field] ? "(set)" : null) : settings[field];
      const newValue = field === "placesApiServerKey" ? (req.body[field] ? "(set)" : null) : req.body[field];
      settings[field] = req.body[field];
      fields.push({ field, oldValue, newValue });
    }
    await settings.save();
    await recordMetaChange({ entityType: "MasjidBotSettings", entityId: 1, entityName: "Masjid Bot Settings", action: "update", actor, fields }).catch(() => {});
    res.json(serializeSettings(settings));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
