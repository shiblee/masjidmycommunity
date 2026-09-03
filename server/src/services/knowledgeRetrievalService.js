import Faq from "../models/Faq.js";
import Page from "../models/Page.js";
import PageContent from "../models/PageContent.js";
import Translation from "../models/Translation.js";
import { ISLAMIC_REFERENCES } from "../data/islamicReferences.js";

// No vector DB, no embeddings — the stack is MySQL-only and the corpus is
// small (a few dozen page sections, ~170 translation keys, however many
// FAQs). Retrieval is honest lexical TF-IDF-style keyword overlap, computed
// fresh per request. Described as "keyword-based search" everywhere it's
// user-facing — never "semantic"/"AI-powered search".

const CONFIDENCE_THRESHOLD = Number(process.env.FAQ_AI_CONFIDENCE_THRESHOLD) || 0.15;
const CACHE_TTL_MS = 3 * 60 * 1000;
const corpusCache = new Map(); // languageCode -> { builtAt, corpus }

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "do", "does", "did",
  "how", "what", "when", "where", "why", "who", "which", "will", "would", "can", "could",
  "should", "of", "in", "on", "at", "to", "for", "with", "about", "as", "by", "and", "or",
  "but", "if", "so", "my", "your", "i", "you", "it", "this", "that", "these", "those", "me",
  "we", "us", "our", "their", "them", "he", "she", "his", "her", "not", "no", "yes", "have",
  "has", "had", "get", "does",
]);

// Maps translationDefaults.js key groups (first two-ish segments) onto the
// same 8 fixed FAQ_CATEGORIES, and excludes pure UI chrome (form labels,
// validation strings, success messages) from the knowledge corpus. Built
// against the FULL key lists in translationDefaults.js, not a sample.
const ABOUTUS_GROUPS = [
  { prefix: "aboutUs.hero", category: "About Masjid My Community", label: "About Us — Introduction" },
  { prefix: "aboutUs.glance", category: "About Masjid My Community", label: "About Us — At a Glance" },
  { prefix: "aboutUs.quickLinks", category: "About Masjid My Community", label: "About Us — Quick Links" },
  { prefix: "aboutUs.whatIs", category: "About Masjid My Community", label: "About Us — What is Masjid My Community" },
  { prefix: "aboutUs.facts", category: "About Masjid My Community", label: "About Us — Quick Facts" },
  { prefix: "aboutUs.quickFacts", category: "About Masjid My Community", label: "About Us — Quick Facts" },
  { prefix: "aboutUs.vision", category: "Vision & Mission", label: "About Us — Our Vision" },
  { prefix: "aboutUs.mission", category: "Vision & Mission", label: "About Us — Our Mission" },
  { prefix: "aboutUs.empowering", category: "Masjid Empowerment", label: "About Us — Empowering Masjids" },
  { prefix: "aboutUs.community", category: "Community", label: "About Us — Masjid as a Community Center" },
  { prefix: "aboutUs.help", category: "Platform Features", label: "About Us — How We Help" },
  { prefix: "aboutUs.faith", category: "Vision & Mission", label: "About Us — Rooted in Our Faith" },
  { prefix: "aboutUs.approachValues", category: "Vision & Mission", label: "About Us — Our Approach & Values" },
  { prefix: "aboutUs.approach", category: "Vision & Mission", label: "About Us — Our Approach" },
  { prefix: "aboutUs.values", category: "Vision & Mission", label: "About Us — Our Values" },
  { prefix: "aboutUs.cta", category: "Getting Started", label: "About Us — Get Started" },
];

const PAGE_CATEGORY = {
  "terms-of-use": "Terms & Policies",
  "privacy-policy": "Privacy & Security",
  "cookie-policy": "Terms & Policies",
};

function classifyTranslationKey(key) {
  if (key.startsWith("contact.info.")) return { category: "Getting Started", label: "Contact Us — Ways to Reach Us" };
  if (/^contact\.[a-zA-Z]+$/.test(key)) return { category: "Getting Started", label: "Contact Us — Overview" };
  for (const g of ABOUTUS_GROUPS) {
    if (key === g.prefix || key.startsWith(g.prefix + ".")) return g;
  }
  return null; // UI chrome (form labels, validation, success messages) — excluded from the corpus
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function faqChunks(languageCode) {
  const faqs = await Faq.findAll({ where: { isActive: true } });
  if (faqs.length === 0) return [];

  const translationRows = await Translation.findAll({
    where: { category: "faq", languageCode },
  });
  const byKey = Object.fromEntries(translationRows.map((r) => [r.key, r.value]));

  return faqs.map((f) => {
    const question = byKey[`faq.question.${f.id}`] || f.question;
    const answer = byKey[`faq.answer.${f.id}`] || f.answer;
    return {
      text: `${question}\n${answer}`,
      sourceLabel: f.category,
      sourceCategory: `faq:${f.category}`,
      url: `/faq#faq-${f.id}`,
    };
  });
}

async function pageChunks() {
  const pages = await Page.findAll({ where: { isActive: true, slug: Object.keys(PAGE_CATEGORY) } });
  const chunks = [];
  for (const page of pages) {
    const content = await PageContent.findOne({ where: { pageId: page.id, languageCode: "en" } });
    if (!content?.bodyHtml) continue;
    const sections = content.bodyHtml.split(/(?=<h2[^>]*>)/i);
    for (const section of sections) {
      const headingMatch = section.match(/<h2[^>]*>(.*?)<\/h2>/i);
      const headingText = headingMatch ? stripHtml(headingMatch[1]) : page.defaultTitle;
      const bodyText = stripHtml(section);
      if (!bodyText) continue;
      chunks.push({
        text: bodyText,
        sourceLabel: `${page.defaultTitle} — ${headingText}`,
        sourceCategory: `page:${page.slug}`,
        url: `/${page.slug}`,
      });
    }
  }
  return chunks;
}

async function translationChunks(languageCode) {
  const [enRows, langRows] = await Promise.all([
    Translation.findAll({ where: { category: ["aboutUs", "contact"], languageCode: "en" } }),
    languageCode !== "en"
      ? Translation.findAll({ where: { category: ["aboutUs", "contact"], languageCode } })
      : Promise.resolve([]),
  ]);
  const overrides = Object.fromEntries(langRows.map((r) => [r.key, r.value]));

  const groups = new Map(); // group label -> { category, label, texts: [] }
  for (const row of enRows) {
    const group = classifyTranslationKey(row.key);
    if (!group) continue;
    const value = overrides[row.key] || row.value;
    if (!value) continue;
    if (!groups.has(group.label)) groups.set(group.label, { category: group.category, label: group.label, texts: [] });
    groups.get(group.label).texts.push(value);
  }

  return [...groups.values()].map((g) => ({
    text: g.texts.join(" "),
    sourceLabel: g.label,
    sourceCategory: `content:${g.label}`,
    url: g.label.startsWith("Contact Us") ? "/contact" : "/about",
  }));
}

async function buildCorpus(languageCode) {
  const cached = corpusCache.get(languageCode);
  if (cached && Date.now() - cached.builtAt < CACHE_TTL_MS) return cached.corpus;

  const [faqs, pages, translations] = await Promise.all([
    faqChunks(languageCode),
    pageChunks(),
    translationChunks(languageCode),
  ]);
  const corpus = [...faqs, ...pages, ...translations].map((c) => ({ ...c, tokens: tokenize(c.text) }));
  corpusCache.set(languageCode, { builtAt: Date.now(), corpus });
  return corpus;
}

function scoreCorpus(queryTokens, corpus) {
  const df = new Map();
  for (const chunk of corpus) {
    const seen = new Set(chunk.tokens);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = corpus.length || 1;
  const idf = (t) => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;

  const queryTf = new Map();
  for (const t of queryTokens) queryTf.set(t, (queryTf.get(t) || 0) + 1);

  return corpus
    .map((chunk) => {
      const chunkTf = new Map();
      for (const t of chunk.tokens) chunkTf.set(t, (chunkTf.get(t) || 0) + 1);

      let dot = 0;
      let chunkNormSq = 0;
      for (const [t, tf] of chunkTf) chunkNormSq += (tf * idf(t)) ** 2;
      const chunkNorm = Math.sqrt(chunkNormSq) || 1;

      let queryNormSq = 0;
      for (const [t, tf] of queryTf) queryNormSq += (tf * idf(t)) ** 2;
      const queryNorm = Math.sqrt(queryNormSq) || 1;

      for (const [t, qtf] of queryTf) {
        if (!chunkTf.has(t)) continue;
        dot += qtf * idf(t) * chunkTf.get(t) * idf(t);
      }

      return { chunk, score: dot / (chunkNorm * queryNorm) };
    })
    .sort((a, b) => b.score - a.score);
}

// Top 5 chunks above a soft "include" floor, capped at 2 per sourceCategory
// so the model isn't fed several near-duplicate FAQ rows and "Based on"
// stays diverse rather than repeating one source five times.
function selectTopChunks(ranked) {
  const perCategory = new Map();
  const selected = [];
  for (const { chunk, score } of ranked) {
    if (selected.length >= 5) break;
    if (score <= 0) continue;
    const count = perCategory.get(chunk.sourceCategory) || 0;
    if (count >= 2) continue;
    perCategory.set(chunk.sourceCategory, count + 1);
    selected.push({ chunk, score });
  }
  return selected;
}

function deriveSources(selected) {
  const seen = new Map();
  for (const { chunk } of selected) {
    if (!seen.has(chunk.sourceCategory)) {
      seen.set(chunk.sourceCategory, { label: chunk.sourceLabel, category: chunk.sourceCategory, url: chunk.url });
    }
  }
  return [...seen.values()];
}

// The core anti-hallucination gate: if nothing in the approved content
// scores above the threshold, the AI is never called — retrieval alone
// decides "not enough information", not a model guess.
export async function retrieve(question, languageCode = "en") {
  const corpus = await buildCorpus(languageCode);
  const queryTokens = tokenize(question);
  const ranked = scoreCorpus(queryTokens, corpus);
  const topScore = ranked[0]?.score || 0;
  const belowThreshold = topScore < CONFIDENCE_THRESHOLD;

  const selected = belowThreshold ? [] : selectTopChunks(ranked);
  const contextText = selected.map(({ chunk }) => `[${chunk.sourceLabel}]\n${chunk.text}`).join("\n\n");
  const sources = deriveSources(selected);

  // Closest existing FAQ regardless of threshold, so even a "not enough
  // information" response can still point somewhere useful.
  const bestFaq = ranked.find((r) => r.chunk.sourceCategory.startsWith("faq:") && r.score > 0);

  return {
    belowThreshold,
    confidence: topScore,
    contextText,
    sources,
    matchedCategories: sources.map((s) => s.category).join(","),
    bestFaqMatch: bestFaq
      ? { id: Number(bestFaq.chunk.url.split("faq-")[1]), question: bestFaq.chunk.text.split("\n")[0] }
      : null,
  };
}

// Pure function, independent of whether the AI was called — a genuine
// topical keyword match only, never a model call. Only ever invoked when
// retrieval itself succeeded (never on a belowThreshold response).
export function pickIslamicReference(question) {
  const tokens = new Set(tokenize(question));
  let best = null;
  let bestCount = 0;
  for (const ref of ISLAMIC_REFERENCES) {
    const count = ref.keywords.filter((k) => tokens.has(k)).length;
    if (count > bestCount) {
      bestCount = count;
      best = ref;
    }
  }
  if (!best || bestCount === 0) return null;
  const { keywords, ...publicRef } = best;
  return publicRef;
}
