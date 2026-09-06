import ReviewRestrictedWord from "../models/ReviewRestrictedWord.js";

// Rule-based restricted-word detection — the shared Common Content
// Moderation Engine described in the Meta → Review Restricted Words
// architecture. Reviews (masjidReviewController.js), Masjid
// Name/Tagline/About (masjidController.js, adminMasjidController.js) and
// Community posts/comments all call this same module rather than keeping
// separate word lists, so an admin editing the Meta library instantly
// governs every consumer with no code change.
//
// Each Meta entry is one moderation *concept* that can carry English,
// Hindi, Urdu and Arabic forms together (any subset), plus free-text
// `variants` for extra spellings/transliterations an admin registers
// explicitly. Matching itself is script-agnostic — a Unicode-aware regex
// checks whatever text is stored regardless of which language column it
// came from, so native Devanagari/Nastaliq/Arabic script is caught exactly
// like English with zero extra logic once an admin has entered it.
//
// Deliberately never reveals *which* term matched — callers only ever see
// `{ flagged, confidence, severity }`, and the user-facing message is
// always the same generic sentence so the library can't be probed or
// reverse-engineered from the app's own responses.

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

/** lowercase -> strip accents -> collapse whitespace runs to a single space. */
function normalizeBase(str) {
  return stripDiacritics(str.toLowerCase()).replace(/\s+/g, " ").trim();
}

/** normalizeBase -> de-leet -> collapse repeated characters. */
function normalizeFuzzy(str) {
  return collapseRepeats(deleet(normalizeBase(str)));
}

/** Removes everything but letters/numbers — catches "f u c k", "f.u.c.k", "f-u-c-k". */
function tighten(str) {
  return str.replace(/[^\p{L}\p{N}]/gu, "");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function boundaryTest(term, haystack) {
  if (!term) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, "u");
  return re.test(haystack);
}

let cachedEntries = null;
let cachedAt = 0;
const CACHE_MS = 30_000; // short cache — admin edits should take effect quickly, not require a redeploy

// Flattens every active Meta row into individual matchable strings, tagged
// with the detection tier and severity of the row they came from. Rows with
// detectionType "ai" carry no literal text to match — they exist purely as
// a categorization hook for the AI/contextual layer (see aiProviderService.js)
// and are skipped here.
async function activeEntries() {
  const now = Date.now();
  if (cachedEntries && now - cachedAt < CACHE_MS) return cachedEntries;

  const rows = await ReviewRestrictedWord.findAll({
    where: { isActive: true },
    attributes: ["textEn", "textHi", "textUr", "textAr", "variants", "detectionType", "severity"],
    raw: true,
  });

  const entries = [];
  for (const row of rows) {
    if (row.detectionType === "ai") continue;
    const texts = [row.textEn, row.textHi, row.textUr, row.textAr, ...(Array.isArray(row.variants) ? row.variants : [])];
    for (const value of texts) {
      if (typeof value === "string" && value.trim()) {
        entries.push({ value: value.trim(), detectionType: row.detectionType, severity: row.severity });
      }
    }
  }

  cachedEntries = entries;
  cachedAt = now;
  return entries;
}

/**
 * Checks `text` against the active restricted-word/phrase library.
 * Returns `{ flagged: boolean, confidence: "high" | "low", severity: string | null }`
 * — never the matched term. Matching strictness is controlled per Meta
 * entry by `detectionType`:
 *  - "exact"/"phrase": literal match after case/accent/whitespace
 *    normalization only — no leet-speak or repeat-character tolerance, for
 *    entries that need precise, low-false-positive matching.
 *  - "variation": adds de-leet + repeated-character collapsing, catching
 *    common spelling variations ("fuuuck", "sh1t").
 *  - "obfuscation" (default): everything "variation" does, plus a
 *    symbols-stripped "tight" match that also catches spacing/punctuation
 *    obfuscation ("f u c k", "f.u.c.k").
 *  - "ai": excluded from this deterministic matching entirely (see
 *    activeEntries above) — a categorization hook for the AI layer only.
 */
export async function checkRestrictedWords(text) {
  if (!text?.trim()) return { flagged: false, confidence: "low", severity: null };

  const entries = await activeEntries();
  if (entries.length === 0) return { flagged: false, confidence: "low", severity: null };

  const baseText = normalizeBase(text);
  const fuzzyText = normalizeFuzzy(text);
  const tightText = tighten(fuzzyText);

  for (const { value, detectionType, severity } of entries) {
    if (detectionType === "exact" || detectionType === "phrase") {
      const term = normalizeBase(value);
      if (boundaryTest(term, baseText)) return { flagged: true, confidence: "high", severity };
      continue;
    }

    // "variation" and "obfuscation" both start from fuzzy normalization.
    const term = normalizeFuzzy(value);
    if (boundaryTest(term, fuzzyText)) return { flagged: true, confidence: "high", severity };

    if (detectionType === "obfuscation") {
      const tightTerm = tighten(term);
      if (tightTerm.length >= 3 && tightText.includes(tightTerm)) {
        return { flagged: true, confidence: "high", severity };
      }
    }
  }

  return { flagged: false, confidence: "low", severity: null };
}

/** Test-only hook: forces the next activeEntries() call to re-hit the DB. */
export function invalidateRestrictedWordCache() {
  cachedEntries = null;
}

// Single generic message for every consumer — never names the field's
// content, which term matched, or which language/rule triggered it, so the
// moderation library can't be reverse-engineered from the app's responses.
export const RESTRICTED_CONTENT_MESSAGE = "This content contains restricted or inappropriate language. Please modify the content and try again.";

/**
 * Checks a `{ fieldKey: text }` map against the restricted-word library in
 * the given key order and returns the first flagged field's key, or `null`
 * if none are flagged. Used wherever multiple free-text fields (Masjid
 * Name/Tagline/About, Community posts, etc.) need the same
 * one-message-per-request UX as a single review body.
 */
export async function firstRestrictedField(fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    const result = await checkRestrictedWords(value);
    if (result.flagged) return key;
  }
  return null;
}
