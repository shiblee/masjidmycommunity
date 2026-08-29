import ConcernType from "../models/ConcernType.js";

const DEFAULTS = [
  "Campaign Related",
  "Payment Related",
  "Account Related",
  "Masjid Information",
  "Technical Issue",
  "Content/Information Issue",
  "Other",
];

export async function ensureConcernTypeDefaults() {
  const count = await ConcernType.count();
  if (count === 0) {
    await Promise.all(DEFAULTS.map((name, i) => ConcernType.create({ name, sortOrder: i })));
  }
}
