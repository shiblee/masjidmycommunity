import MasjidBotSettings from "../models/MasjidBotSettings.js";
import { recordMetaChange, metaActorFrom } from "../utils/metaChangeLog.js";
import { checkForDuplicate } from "../services/masjidDuplicateDetectionService.js";
import { searchMosques } from "../services/googlePlacesService.js";
import { runDiscoveryCycle } from "../services/masjidDiscoveryService.js";
import { getMasjidBotSchedulerState } from "../services/masjidBotSchedulerService.js";
import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import MasjidImportSource from "../models/MasjidImportSource.js";
import MasjidPhoto from "../models/MasjidPhoto.js";

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

// Real, immediate discovery+import cycle — bypasses the scheduler, writes
// a real Masjid if a genuinely new one is found. Reuses the exact same
// runDiscoveryCycle() the hourly scheduler calls, so this is a true test
// of the real pipeline, not a separate code path.
export const testImport = async (req, res) => {
  try {
    const settings = await MasjidBotSettings.findByPk(1);
    const imported = await runDiscoveryCycle(settings);
    if (!imported) return res.json({ imported: false, message: "No genuinely new mosque found in this attempt — try again, or a wider area may already be covered." });
    res.json({ imported: true, ...imported });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStatus = async (req, res) => {
  try {
    const settings = await MasjidBotSettings.findByPk(1);
    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0));
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    const [importedThisHour, importedToday, importedThisMonth, totalImported, pendingReview, mediaImported, duplicatesPrevented] = await Promise.all([
      Masjid.count({ where: { creationMethod: "bot_import", createdAt: { [Op.gte]: hourStart } } }),
      Masjid.count({ where: { creationMethod: "bot_import", createdAt: { [Op.gte]: dayStart } } }),
      Masjid.count({ where: { creationMethod: "bot_import", createdAt: { [Op.gte]: monthStart } } }),
      Masjid.count({ where: { creationMethod: "bot_import" } }),
      Masjid.count({ where: { creationMethod: "bot_import", status: "under_review" } }),
      MasjidPhoto.count({ where: { sourceType: "google_places" } }),
      MasjidImportSource.count({ where: { duplicateCheckResult: "merged" } }),
    ]);

    const remainingQuota = Math.max(settings.masjidsPerHour - importedThisHour, 0);
    const remainingMinutes = Math.max(60 - now.getUTCMinutes(), 1);
    const state = getMasjidBotSchedulerState();

    res.json({
      enabled: settings.enabled,
      masjidsPerHour: settings.masjidsPerHour,
      importedThisHour,
      importedToday,
      importedThisMonth,
      totalImported,
      pendingReview,
      duplicatesPrevented,
      mediaImported,
      estimatedNextImport: settings.enabled && remainingQuota > 0 ? new Date(now.getTime() + (remainingMinutes / remainingQuota) * 60000) : null,
      schedulerStatus: settings.enabled ? "running" : "stopped",
      lastImported: state.lastImported,
      lastError: state.lastError,
    });
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
