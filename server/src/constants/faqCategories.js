// Fixed for v1 — not an admin-manageable meta-entity like ContactTopic/
// ConcernType. Single source of truth: imported by the admin FAQ controller
// (validates `category` on create/update) and knowledgeRetrievalService.js
// (maps Page/Translation content into these same buckets for "Based on").
export const FAQ_CATEGORIES = [
  "About Masjid My Community",
  "Vision & Mission",
  "Masjid Empowerment",
  "Community",
  "Privacy & Security",
  "Terms & Policies",
  "Platform Features",
  "Getting Started",
];
