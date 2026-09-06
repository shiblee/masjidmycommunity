import ReviewRestrictedWord from "../models/ReviewRestrictedWord.js";

// A starter set so the moderation feature isn't empty on first boot —
// additive only (never touches existing rows), same pattern as every other
// *Defaults.js seed file in this project.
//
// English coverage is the most complete since that's the language this
// list can be verified in with confidence. The Hindi/Urdu/Arabic starter
// terms below are ROMANIZED spellings (e.g. "chutiya", "kutta") — not
// verified native-script (Devanagari/Nastaliq/Arabic) text — so they're
// stored under `variants` (the field meant for transliterated/alternate
// spellings) rather than the `textHi`/`textUr`/`textAr` columns, which are
// reserved for admin-verified native-script forms. Populating genuine
// native-script equivalents is left as an admin/linguistic-review task via
// the Review Restricted Words panel — auto-generating script conversions
// here risks putting inaccurate text into a live, admin-facing moderation
// list.
const DEFAULTS = [
  // Vulgar/Abusive
  { textEn: "fuck", category: "Vulgar/Abusive" },
  { textEn: "shit", category: "Vulgar/Abusive" },
  { textEn: "bastard", category: "Vulgar/Abusive" },
  { textEn: "asshole", category: "Vulgar/Abusive" },
  { textEn: "bitch", category: "Vulgar/Abusive" },
  { textEn: "dumbass", category: "Vulgar/Abusive" },
  { textEn: "idiot", category: "Vulgar/Abusive" },
  { textEn: "moron", category: "Vulgar/Abusive" },

  // Sexual/Explicit
  { textEn: "porn", category: "Sexual/Explicit" },
  { textEn: "whore", category: "Sexual/Explicit" },
  { textEn: "slut", category: "Sexual/Explicit" },
  { textEn: "cunt", category: "Sexual/Explicit" },

  // Hate/Harassment
  { textEn: "nigger", category: "Hate/Harassment" },
  { textEn: "faggot", category: "Hate/Harassment" },
  { textEn: "retard", category: "Hate/Harassment" },
  { textEn: "terrorist", category: "Hate/Harassment" },

  // Threatening — multi-word phrases, matched with detectionType "phrase"
  // so they require the exact word sequence rather than fuzzy/obfuscation
  // matching (short phrases like these are more prone to false positives
  // under leet/repeat-character tolerance).
  { textEn: "kill you", category: "Threatening", detectionType: "phrase" },
  { textEn: "i will kill", category: "Threatening", detectionType: "phrase" },
  { textEn: "burn it down", category: "Threatening", detectionType: "phrase" },

  // Offensive
  { textEn: "scam", category: "Offensive" },
  { textEn: "fraud", category: "Offensive" },
  { textEn: "fake masjid", category: "Offensive", detectionType: "phrase" },

  // Hindi (romanized starter set — see file header)
  { category: "Vulgar/Abusive", variants: ["chutiya"] },
  { category: "Vulgar/Abusive", variants: ["madarchod"] },
  { category: "Sexual/Explicit", variants: ["randi"] },
  { category: "Offensive", variants: ["kutte"] },

  // Urdu (romanized starter set — see file header)
  { category: "Vulgar/Abusive", variants: ["haramzada"] },
  { category: "Offensive", variants: ["kutta"] },

  // Arabic (romanized starter set — see file header)
  { category: "Offensive", variants: ["kalb"] },
  { category: "Sexual/Explicit", variants: ["sharmouta"] },
];

export async function ensureReviewRestrictedWordDefaults() {
  const count = await ReviewRestrictedWord.count();
  if (count === 0) {
    await ReviewRestrictedWord.bulkCreate(DEFAULTS, { ignoreDuplicates: true });
  }
}
