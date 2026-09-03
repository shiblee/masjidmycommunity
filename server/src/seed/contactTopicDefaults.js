import ContactTopic from "../models/ContactTopic.js";

const DEFAULTS = [
  ["General Inquiry", "compass"],
  ["Masjid Registration", "mosque"],
  ["Campaign & Fundraising", "flag"],
  ["Partnership", "link"],
  ["Media & Press", "star"],
  ["Technical Support", "monitor"],
];

export async function ensureContactTopicDefaults() {
  const count = await ContactTopic.count();
  if (count === 0) {
    await Promise.all(DEFAULTS.map(([name, icon], i) => ContactTopic.create({ name, icon, sortOrder: i })));
  }
}
