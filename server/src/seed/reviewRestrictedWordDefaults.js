import ReviewRestrictedWord from "../models/ReviewRestrictedWord.js";

// A starter set so the moderation feature isn't empty on first boot —
// additive only (never touches existing rows), same pattern as every other
// *Defaults.js seed file in this project. English coverage is the most
// complete since that's the language this list can be verified in with
// confidence; Hindi/Urdu/Arabic have a small illustrative set only —
// admins are expected to expand multilingual coverage via the Review
// Restricted Words panel (including its Bulk Import action).
const DEFAULTS = [
  // Vulgar/Abusive
  { term: "fuck", category: "Vulgar/Abusive", language: "en" },
  { term: "shit", category: "Vulgar/Abusive", language: "en" },
  { term: "bastard", category: "Vulgar/Abusive", language: "en" },
  { term: "asshole", category: "Vulgar/Abusive", language: "en" },
  { term: "bitch", category: "Vulgar/Abusive", language: "en" },
  { term: "dumbass", category: "Vulgar/Abusive", language: "en" },
  { term: "idiot", category: "Vulgar/Abusive", language: "en" },
  { term: "moron", category: "Vulgar/Abusive", language: "en" },

  // Sexual/Explicit
  { term: "porn", category: "Sexual/Explicit", language: "en" },
  { term: "whore", category: "Sexual/Explicit", language: "en" },
  { term: "slut", category: "Sexual/Explicit", language: "en" },
  { term: "cunt", category: "Sexual/Explicit", language: "en" },

  // Hate/Harassment
  { term: "nigger", category: "Hate/Harassment", language: "en" },
  { term: "faggot", category: "Hate/Harassment", language: "en" },
  { term: "retard", category: "Hate/Harassment", language: "en" },
  { term: "terrorist", category: "Hate/Harassment", language: "en" },

  // Threatening
  { term: "kill you", category: "Threatening", language: "en" },
  { term: "i will kill", category: "Threatening", language: "en" },
  { term: "burn it down", category: "Threatening", language: "en" },

  // Offensive
  { term: "scam", category: "Offensive", language: "en" },
  { term: "fraud", category: "Offensive", language: "en" },
  { term: "fake masjid", category: "Offensive", language: "en" },

  // Hindi (illustrative starter set)
  { term: "chutiya", category: "Vulgar/Abusive", language: "hi" },
  { term: "madarchod", category: "Vulgar/Abusive", language: "hi" },
  { term: "randi", category: "Sexual/Explicit", language: "hi" },
  { term: "kutte", category: "Offensive", language: "hi" },

  // Urdu (illustrative starter set)
  { term: "haramzada", category: "Vulgar/Abusive", language: "ur" },
  { term: "kutta", category: "Offensive", language: "ur" },

  // Arabic (illustrative starter set)
  { term: "kalb", category: "Offensive", language: "ar" },
  { term: "sharmouta", category: "Sexual/Explicit", language: "ar" },
];

export async function ensureReviewRestrictedWordDefaults() {
  const count = await ReviewRestrictedWord.count();
  if (count === 0) {
    await ReviewRestrictedWord.bulkCreate(DEFAULTS, { ignoreDuplicates: true });
  }
}
