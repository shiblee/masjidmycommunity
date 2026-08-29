import UserNotification from "../models/UserNotification.js";

// Fire-and-forget like emailService — a notification failing to write must
// never break the admin action that triggered it.
export async function notifyUser({ userId, type, title, body, link, relatedMasjidId, relatedCampaignId }) {
  if (!userId) return null;
  try {
    return await UserNotification.create({ userId, type, title, body, link, relatedMasjidId, relatedCampaignId });
  } catch {
    return null;
  }
}
