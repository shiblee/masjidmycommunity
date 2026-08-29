import ContentSettings from "../models/ContentSettings.js";

const FIELDS = ["maxPostLength", "maxCommentLength", "maxReplyLength"];

export const getSettings = async (req, res) => {
  try {
    const settings = await ContentSettings.findByPk(1);
    res.json({
      maxPostLength: settings?.maxPostLength ?? 2000,
      maxCommentLength: settings?.maxCommentLength ?? 1000,
      maxReplyLength: settings?.maxReplyLength ?? 1000,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = {};
    for (const field of FIELDS) {
      if (req.body[field] === undefined) continue;
      const n = Number(req.body[field]);
      if (!Number.isInteger(n) || n < 1) {
        return res.status(400).json({ message: "Each limit must be a whole number of at least 1 character." });
      }
      updates[field] = n;
    }

    const [settings] = await ContentSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, ...updates } });
    Object.assign(settings, updates);
    await settings.save();

    res.json({
      maxPostLength: settings.maxPostLength,
      maxCommentLength: settings.maxCommentLength,
      maxReplyLength: settings.maxReplyLength,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
