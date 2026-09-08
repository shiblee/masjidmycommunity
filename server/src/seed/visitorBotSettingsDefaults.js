import VisitorBotSettings from "../models/VisitorBotSettings.js";

export async function ensureVisitorBotSettings() {
  const existing = await VisitorBotSettings.findByPk(1);
  if (!existing) {
    await VisitorBotSettings.create({ id: 1 });
  }
}
