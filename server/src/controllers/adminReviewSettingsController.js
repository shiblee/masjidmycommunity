import ReviewSettings from "../models/ReviewSettings.js";

const NUMERIC_FIELDS = ["maxLength", "maxImages", "maxVideoSizeMB", "maxVideoDurationSeconds"];
const STRING_FIELDS = ["allowedImageFormats", "allowedVideoFormats"];
const BOOL_FIELDS = ["mediaEnabled", "speechToTextEnabled"];

function shape(settings) {
  return {
    maxLength: settings?.maxLength ?? 1000,
    maxImages: settings?.maxImages ?? 5,
    maxVideoSizeMB: settings?.maxVideoSizeMB ?? 50,
    maxVideoDurationSeconds: settings?.maxVideoDurationSeconds ?? 60,
    allowedImageFormats: settings?.allowedImageFormats ?? "jpg,png,webp",
    allowedVideoFormats: settings?.allowedVideoFormats ?? "mp4,webm,mov",
    mediaEnabled: settings?.mediaEnabled ?? true,
    speechToTextEnabled: settings?.speechToTextEnabled ?? true,
  };
}

export const getSettings = async (req, res) => {
  try {
    const settings = await ReviewSettings.findByPk(1);
    res.json(shape(settings));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = {};
    for (const field of NUMERIC_FIELDS) {
      if (req.body[field] === undefined) continue;
      const n = Number(req.body[field]);
      if (!Number.isInteger(n) || n < 1) {
        return res.status(400).json({ message: "Each limit must be a whole number of at least 1." });
      }
      updates[field] = n;
    }
    for (const field of STRING_FIELDS) {
      if (req.body[field] === undefined) continue;
      const value = String(req.body[field]).trim();
      if (!value) return res.status(400).json({ message: "Allowed formats can't be empty." });
      updates[field] = value;
    }
    for (const field of BOOL_FIELDS) {
      if (req.body[field] === undefined) continue;
      updates[field] = !!req.body[field];
    }

    const [settings] = await ReviewSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, ...updates } });
    Object.assign(settings, updates);
    await settings.save();

    res.json(shape(settings));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
