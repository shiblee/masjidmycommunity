import AdminNotification from "../models/AdminNotification.js";

// Fire-and-forget like emailService/notificationService — a notification
// failing to write must never break the user action that triggered it.
export async function notifyAdmins({ type, title, body, link, relatedConcernId, relatedContactId }) {
  try {
    return await AdminNotification.create({ type, title, body, link, relatedConcernId, relatedContactId });
  } catch {
    return null;
  }
}
