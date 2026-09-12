import ReelDeletionReason from "../models/ReelDeletionReason.js";

const DEFAULTS = [
  "Uploaded by mistake",
  "Wrong video",
  "No longer want to share this",
  "Privacy concern",
  "Poor video or audio quality",
  "Other",
];

export async function ensureReelDeletionReasonDefaults() {
  const count = await ReelDeletionReason.count();
  if (count === 0) {
    await Promise.all(DEFAULTS.map((name, i) => ReelDeletionReason.create({ name, sortOrder: i })));
  }
}
