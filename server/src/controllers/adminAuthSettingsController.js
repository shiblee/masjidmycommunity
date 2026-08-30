import AuthSettings from "../models/AuthSettings.js";

const FIELDS = ["otpExpiryMinutes", "otpResendCooldownSeconds", "otpMaxAttempts"];

export const getSettings = async (req, res) => {
  try {
    const settings = await AuthSettings.findByPk(1);
    res.json({
      otpExpiryMinutes: settings?.otpExpiryMinutes ?? 5,
      otpResendCooldownSeconds: settings?.otpResendCooldownSeconds ?? 60,
      otpMaxAttempts: settings?.otpMaxAttempts ?? 5,
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
        return res.status(400).json({ message: "Each value must be a whole number of at least 1." });
      }
      updates[field] = n;
    }

    const [settings] = await AuthSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, ...updates } });
    Object.assign(settings, updates);
    await settings.save();

    res.json({
      otpExpiryMinutes: settings.otpExpiryMinutes,
      otpResendCooldownSeconds: settings.otpResendCooldownSeconds,
      otpMaxAttempts: settings.otpMaxAttempts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
