import ReviewRestrictedWord from "../models/ReviewRestrictedWord.js";

// Rule-based restricted-word detection for review text. Deliberately never
// reveals *which* term matched — callers only ever see `{ flagged,
// confidence }`, and the user-facing message is always the same generic
// sentence (see masjidReviewController.js) so the library can't be probed
// or reverse-engineered from the app's own responses.

const LEET_MAP = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };

function deleet(str) {
  return str
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("");
}

// Collapses runs of 3+ identical characters to one — catches "fuuuuck",
// "shiiiit" without also mangling legitimate doubled letters like "good"
// or "committee" (which only ever repeat twice).
function collapseRepeats(str) {
  return str.replace(/(.)\1{2,}/g, "$1");
}

function stripDiacritics(str) {
  return str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/** lowercase -> strip accents -> de-leet -> collapse repeats. Spacing/punctuation is kept at this stage. */
function normalize(text) {
  return collapseRepeats(deleet(stripDiacritics(text.toLowerCase())));
}

/** Removes everything but letters/numbers — catches "f u c k", "f.u.c.k", "f-u-c-k". */
function tighten(str) {
  return str.replace(/[^\p{L}\p{N}]/gu, "");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let cachedWords = null;
let cachedAt = 0;
const CACHE_MS = 30_000; // short cache — admin edits should take effect quickly, not require a redeploy

async function activeTerms() {
  const now = Date.now();
  if (cachedWords && now - cachedAt < CACHE_MS) return cachedWords;
  const rows = await ReviewRestrictedWord.findAll({ where: { isActive: true }, attributes: ["term"], raw: true });
  cachedWords = rows.map((r) => r.term);
  cachedAt = now;
  return cachedWords;
}

/**
 * Checks `text` against the active restricted-word library.
 * Returns `{ flagged: boolean, confidence: "high" | "low" }` — never the
 * matched term. A "high" match should be rejected outright; "low"
 * (currently unused by rule-based matching alone — reserved for the AI
 * layer added in a later phase) can be routed to admin review instead.
 */
export async function checkRestrictedWords(text) {
  if (!text?.trim()) return { flagged: false, confidence: "low" };

  const terms = await activeTerms();
  if (terms.length === 0) return { flagged: false, confidence: "low" };

  const normalized = normalize(text);
  const tight = tighten(normalized);

  for (const rawTerm of terms) {
    const term = normalize(rawTerm);
    if (!term) continue;

    // Whole word/phrase match on the normalized (but still spaced) text.
    const boundary = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, "u");
    if (boundary.test(normalized)) return { flagged: true, confidence: "high" };

    // Tight match catches spacing/symbol obfuscation ("f u c k" -> "fuck").
    // Guarded to terms of 3+ letters to limit false positives on short terms
    // appearing inside unrelated longer words.
    const tightTerm = tighten(term);
    if (tightTerm.length >= 3 && tight.includes(tightTerm)) return { flagged: true, confidence: "high" };
  }

  return { flagged: false, confidence: "low" };
}

/** Test-only hook: forces the next activeTerms() call to re-hit the DB. */
export function invalidateRestrictedWordCache() {
  cachedWords = null;
}
