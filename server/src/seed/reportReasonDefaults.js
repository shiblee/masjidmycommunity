import ReportReason from "../models/ReportReason.js";

const DEFAULTS = [
  "Inappropriate Content",
  "Spam",
  "Misleading Information",
  "Offensive Content",
  "Religious Sensitivity",
  "Fraudulent/Scam Content",
  "Duplicate Content",
  "Other",
];

export async function ensureReportReasonDefaults() {
  const count = await ReportReason.count();
  if (count === 0) {
    await Promise.all(DEFAULTS.map((name, i) => ReportReason.create({ name, sortOrder: i })));
  }
}
