import MasjidBotSettings from "../models/MasjidBotSettings.js";

export async function ensureMasjidBotSettings() {
  const existing = await MasjidBotSettings.findByPk(1);
  if (!existing) {
    await MasjidBotSettings.create({ id: 1 });
  }
}
