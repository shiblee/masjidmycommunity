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
  { textEn: "crap", category: "Vulgar/Abusive" },
  { textEn: "damn", category: "Vulgar/Abusive" },
  { textEn: "bollocks", category: "Vulgar/Abusive" },
  { textEn: "wanker", category: "Vulgar/Abusive" },
  { textEn: "jackass", category: "Vulgar/Abusive" },
  { textEn: "dipshit", category: "Vulgar/Abusive" },
  { textEn: "bullshit", category: "Vulgar/Abusive" },
  { textEn: "dick", category: "Vulgar/Abusive" },
  { textEn: "dickhead", category: "Vulgar/Abusive" },
  { textEn: "prick", category: "Vulgar/Abusive" },
  { textEn: "twat", category: "Vulgar/Abusive" },
  { textEn: "bugger", category: "Vulgar/Abusive" },
  { textEn: "motherfucker", category: "Vulgar/Abusive" },
  { textEn: "fucker", category: "Vulgar/Abusive" },
  { textEn: "shithead", category: "Vulgar/Abusive" },
  { textEn: "douchebag", category: "Vulgar/Abusive" },
  { textEn: "scumbag", category: "Vulgar/Abusive" },
  { textEn: "cretin", category: "Vulgar/Abusive" },
  { textEn: "imbecile", category: "Vulgar/Abusive" },
  { textEn: "asswipe", category: "Vulgar/Abusive" },
  { textEn: "cocksucker", category: "Vulgar/Abusive" },
  { textEn: "son of a bitch", category: "Vulgar/Abusive", detectionType: "phrase" },
  { textEn: "piss off", category: "Vulgar/Abusive", detectionType: "phrase" },

  // Sexual/Explicit
  { textEn: "porn", category: "Sexual/Explicit" },
  { textEn: "whore", category: "Sexual/Explicit" },
  { textEn: "slut", category: "Sexual/Explicit" },
  { textEn: "cunt", category: "Sexual/Explicit" },
  { textEn: "pussy", category: "Sexual/Explicit" },
  { textEn: "cock", category: "Sexual/Explicit" },
  { textEn: "blowjob", category: "Sexual/Explicit" },
  { textEn: "handjob", category: "Sexual/Explicit" },
  { textEn: "nude photos", category: "Sexual/Explicit", detectionType: "phrase" },
  { textEn: "send nudes", category: "Sexual/Explicit", detectionType: "phrase" },
  { textEn: "sex tape", category: "Sexual/Explicit", detectionType: "phrase" },
  { textEn: "escort service", category: "Sexual/Explicit", detectionType: "phrase" },
  { textEn: "call girl", category: "Sexual/Explicit", detectionType: "phrase" },
  { textEn: "hooker", category: "Sexual/Explicit" },

  // Hate/Harassment
  { textEn: "nigger", category: "Hate/Harassment" },
  { textEn: "faggot", category: "Hate/Harassment" },
  { textEn: "retard", category: "Hate/Harassment" },
  { textEn: "terrorist", category: "Hate/Harassment" },
  { textEn: "chink", category: "Hate/Harassment" },
  { textEn: "spic", category: "Hate/Harassment" },
  { textEn: "kike", category: "Hate/Harassment" },
  { textEn: "paki", category: "Hate/Harassment" },
  { textEn: "tranny", category: "Hate/Harassment" },
  { textEn: "subhuman", category: "Hate/Harassment" },
  { textEn: "kill yourself", category: "Hate/Harassment", detectionType: "phrase" },
  { textEn: "kys", category: "Hate/Harassment", detectionType: "exact" },
  { textEn: "go back to your country", category: "Hate/Harassment", detectionType: "phrase" },

  // Threatening — multi-word phrases, matched with detectionType "phrase"
  // so they require the exact word sequence rather than fuzzy/obfuscation
  // matching (short phrases like these are more prone to false positives
  // under leet/repeat-character tolerance).
  { textEn: "kill you", category: "Threatening", detectionType: "phrase" },
  { textEn: "i will kill", category: "Threatening", detectionType: "phrase" },
  { textEn: "burn it down", category: "Threatening", detectionType: "phrase" },
  { textEn: "we will find you", category: "Threatening", detectionType: "phrase" },
  { textEn: "i will hurt you", category: "Threatening", detectionType: "phrase" },
  { textEn: "blow up the masjid", category: "Threatening", detectionType: "phrase" },
  { textEn: "bomb threat", category: "Threatening", detectionType: "phrase" },
  { textEn: "i will destroy you", category: "Threatening", detectionType: "phrase" },
  { textEn: "watch your back", category: "Threatening", detectionType: "phrase" },

  // Offensive
  { textEn: "scam", category: "Offensive" },
  { textEn: "fraud", category: "Offensive" },
  { textEn: "fake masjid", category: "Offensive", detectionType: "phrase" },
  { textEn: "scammer", category: "Offensive" },
  { textEn: "con artist", category: "Offensive", detectionType: "phrase" },
  { textEn: "fake charity", category: "Offensive", detectionType: "phrase" },
  { textEn: "ponzi scheme", category: "Offensive", detectionType: "phrase" },

  // Hindi (romanized starter set — see file header)
  { category: "Vulgar/Abusive", variants: ["chutiya"] },
  { category: "Vulgar/Abusive", variants: ["madarchod"] },
  { category: "Sexual/Explicit", variants: ["randi"] },
  { category: "Offensive", variants: ["kutte"] },
  { category: "Vulgar/Abusive", variants: ["behenchod"] },
  { category: "Vulgar/Abusive", variants: ["bhosdike"] },
  { category: "Vulgar/Abusive", variants: ["gandu"] },
  { category: "Vulgar/Abusive", variants: ["harami"] },
  { category: "Vulgar/Abusive", variants: ["kamina"] },
  { category: "Sexual/Explicit", variants: ["chodu"] },
  { category: "Sexual/Explicit", variants: ["lund"] },
  { category: "Sexual/Explicit", variants: ["gaand"] },
  { category: "Sexual/Explicit", variants: ["chut"] },
  { category: "Vulgar/Abusive", variants: ["saala kutta"] },

  // Urdu (romanized starter set — see file header)
  { category: "Vulgar/Abusive", variants: ["haramzada"] },
  { category: "Offensive", variants: ["kutta"] },
  { category: "Offensive", variants: ["kanjar"] },
  { category: "Vulgar/Abusive", variants: ["khotay"] },
  { category: "Vulgar/Abusive", variants: ["ullu ka pattha"] },

  // Arabic (romanized starter set — see file header)
  { category: "Offensive", variants: ["kalb"] },
  { category: "Sexual/Explicit", variants: ["sharmouta"] },
  { category: "Vulgar/Abusive", variants: ["khara"] },
  { category: "Vulgar/Abusive", variants: ["zeft"] },
  { category: "Hate/Harassment", variants: ["manyak"] },
  { category: "Vulgar/Abusive", variants: ["ibn el kalb"] },
];

export async function ensureReviewRestrictedWordDefaults() {
  const count = await ReviewRestrictedWord.count();
  if (count === 0) {
    await ReviewRestrictedWord.bulkCreate(DEFAULTS, { ignoreDuplicates: true });
  }
}
