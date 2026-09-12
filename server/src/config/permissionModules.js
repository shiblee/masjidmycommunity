// Single source of truth for the Staff permission matrix -- both the
// permission-editor checkboxes (client) and the requirePermission()
// enforcement middleware (server) read from this list, so "configurable,
// not hard-coded" holds for the whole module set even though real backend
// enforcement (see permission.js's ENFORCED_MODULES) only covers a
// first-pass subset today. Keys match this app's actual admin nav
// sections -- there is no third-party "Ozonetel" module in this codebase;
// that was an illustrative example in the original spec, not a literal
// module to build.
export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  { key: "masjid", label: "Masjid", actions: ["view", "add", "edit", "delete", "approve"] },
  { key: "masjidCorrections", label: "Correction Requests", actions: ["view", "edit"] },
  { key: "pendingReviews", label: "Pending Reviews", actions: ["view", "edit"] },
  { key: "greenTick", label: "Green Tick", actions: ["view", "edit", "approve"] },
  { key: "users", label: "Users", actions: ["view", "edit", "delete"] },
  { key: "visitors", label: "Visitors", actions: ["view"] },
  { key: "staff", label: "Staff", actions: ["view", "add", "edit", "delete"] },
  { key: "campaigns", label: "Campaigns", actions: ["view", "add", "edit", "delete", "approve"] },
  { key: "jobs", label: "Jobs", actions: ["view", "add", "edit", "delete"] },
  { key: "communityWall", label: "Community Wall", actions: ["view", "create", "edit", "delete"] },
  { key: "moderation", label: "Reported Content", actions: ["view", "edit"] },
  { key: "reports", label: "Reports", actions: ["view", "export"] },
  { key: "meta", label: "Meta", actions: ["view", "edit"] },
  { key: "pages", label: "Pages", actions: ["view", "edit"] },
  { key: "translations", label: "Translations", actions: ["view", "edit"] },
  { key: "notifications", label: "Notifications", actions: ["view", "edit"] },
  { key: "settings", label: "Settings", actions: ["view", "edit"] },
  { key: "support", label: "Support & Help", actions: ["view", "edit"] },
  { key: "testimonials", label: "Testimonials & Stories", actions: ["view", "edit"] },
  { key: "developer", label: "Developer", actions: ["view", "edit"] },
];

export const PERMISSION_MODULE_KEYS = new Set(PERMISSION_MODULES.map((m) => m.key));

export function isValidPermissions(permissions) {
  if (permissions === null) return true;
  if (typeof permissions !== "object" || Array.isArray(permissions)) return false;
  return Object.entries(permissions).every(([key, actions]) => {
    const moduleDef = PERMISSION_MODULES.find((m) => m.key === key);
    return moduleDef && Array.isArray(actions) && actions.every((a) => moduleDef.actions.includes(a));
  });
}
