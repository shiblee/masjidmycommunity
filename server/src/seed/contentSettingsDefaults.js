import ContentSettings from "../models/ContentSettings.js";

export async function ensureContentSettings() {
  const existing = await ContentSettings.findByPk(1);
  if (!existing) {
    await ContentSettings.create({ id: 1, maxPostLength: 2000, maxCommentLength: 1000, maxReplyLength: 1000 });
  }
}
