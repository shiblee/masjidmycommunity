import VisitorSettings from "../models/VisitorSettings.js";

export async function ensureVisitorSettings() {
  const existing = await VisitorSettings.findByPk(1);
  if (!existing) {
    await VisitorSettings.create({ id: 1 });
  }
}
