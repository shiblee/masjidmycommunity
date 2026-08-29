import ModerationSettings from "../models/ModerationSettings.js";

export async function ensureModerationSettings() {
  const existing = await ModerationSettings.findByPk(1);
  if (!existing) {
    await ModerationSettings.create({ id: 1, reportThreshold: 10 });
  }
}
