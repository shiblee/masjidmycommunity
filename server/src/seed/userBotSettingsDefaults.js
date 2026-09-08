import UserBotSettings from "../models/UserBotSettings.js";

export async function ensureUserBotSettings() {
  const existing = await UserBotSettings.findByPk(1);
  if (!existing) {
    await UserBotSettings.create({ id: 1 });
  }
}
