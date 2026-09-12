import DevDocModule from "../models/DevDocModule.js";
import DevDocSection from "../models/DevDocSection.js";
import { DEFAULT_SECTION_KEYS } from "../controllers/adminDeveloperController.js";

// The Developer module's starting module list -- the real, currently-built
// feature set (no Followers/Following, Friends/Connections, Messages, or a
// generic Search module, since none of those exist in this app today).
// Every module gets seeded with the fixed default section set; content
// itself is authored afterward through the admin UI, not here.
const MODULE_DEFAULTS = [
  // Identity & Access
  ["registration", "Registration", "Identity & Access"],
  ["login-authentication", "Login / Authentication", "Identity & Access"],
  ["my-profile", "My Profile", "Identity & Access"],
  ["other-user-profile", "Other User Profile", "Identity & Access"],
  ["admin-staff", "Admin / Staff", "Identity & Access"],
  ["permissions", "Permissions", "Identity & Access"],

  // Community
  ["community-wall", "Community Wall", "Community"],
  ["posts", "Posts", "Community"],
  ["comments-replies", "Comments & Replies", "Community"],
  ["likes-engagement", "Likes / Engagement", "Community"],
  ["reels", "Reels", "Community"],
  ["registered-users-directory", "Registered Users Directory", "Community"],
  ["notifications", "Notifications", "Community"],

  // Masjid & Prayer
  ["masjid", "Masjid", "Masjid & Prayer"],
  ["prayer-times", "Prayer Times", "Masjid & Prayer"],

  // Fundraising & Work
  ["campaigns-fundraising", "Campaigns / Fundraising", "Fundraising & Work"],
  ["jobs", "Jobs", "Fundraising & Work"],

  // Support & Platform
  ["user-reports-concerns", "User Reports / Concerns", "Support & Platform"],
  ["contact-us", "Contact Us", "Support & Platform"],
  ["localization", "Localization", "Support & Platform"],
  ["database", "Database", "Support & Platform"],
];

export async function ensureDevDocDefaults() {
  const count = await DevDocModule.count();
  if (count > 0) return;

  for (let i = 0; i < MODULE_DEFAULTS.length; i++) {
    const [key, title, category] = MODULE_DEFAULTS[i];
    const module = await DevDocModule.create({ key, title, category, sortOrder: i });
    await DevDocSection.bulkCreate(
      DEFAULT_SECTION_KEYS.map((s, j) => ({ moduleId: module.id, key: s.key, title: s.title, bodyHtml: "", sortOrder: j }))
    );
  }
}
