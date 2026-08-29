import DeletionReason from "../models/DeletionReason.js";

const DEFAULTS = [
  "Masjid information was added incorrectly",
  "Masjid is no longer associated with me",
  "Masjid has been added by mistake",
  "Duplicate Masjid",
  "Masjid information is no longer required",
  "Other",
];

export async function ensureDeletionReasonDefaults() {
  const count = await DeletionReason.count();
  if (count === 0) {
    await Promise.all(DEFAULTS.map((name, i) => DeletionReason.create({ name, sortOrder: i })));
  }
}
