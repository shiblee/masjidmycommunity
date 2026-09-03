import Page from "../models/Page.js";
import PageContent from "../models/PageContent.js";
import Translation from "../models/Translation.js";

const LANGUAGES = ["en", "hi", "ur", "ar"];

// Section shape for each of the three legal documents, matching what was
// authored as translation keys (legalTerms.*, legalPrivacy.*, legalCookies.*)
// before this Pages module existed. Used only once, below, to assemble the
// initial rich-text bodyHtml for each page/language from that already-
// translated text — after this first run Pages are fully admin-owned and
// this file has nothing left to do.
const DOCS = [
  {
    slug: "terms-of-use",
    category: "legalTerms",
    sections: [
      ["acceptance", 2],
      ["service", 2],
      ["eligibility", 2],
      ["registration", 2],
      ["donations", 3],
      ["conduct", 1],
      ["fees", 2],
      ["ip", 1],
      ["liability", 2],
      ["termination", 1],
      ["law", 1],
      ["changes", 1],
      ["contact", 1],
    ],
  },
  {
    slug: "privacy-policy",
    category: "legalPrivacy",
    sections: [
      ["introduction", 2],
      ["collect", 3],
      ["use", 2],
      ["payments", 2],
      ["sharing", 2],
      ["cookies", 1],
      ["security", 1],
      ["retention", 1],
      ["rights", 2],
      ["children", 1],
      ["transfers", 1],
      ["changes", 1],
      ["contact", 1],
    ],
  },
  {
    slug: "cookie-policy",
    category: "legalCookies",
    sections: [
      ["what", 1],
      ["types", 3],
      ["how", 1],
      ["third-party", 1],
      ["manage", 1, true], // true = mount the interactive cookie-preferences widget after this section
      ["browser", 1],
      ["changes", 1],
      ["contact", 1],
    ],
  },
];

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function valueFor(key, lang) {
  const row = await Translation.findOne({ where: { key, languageCode: lang } });
  return row?.value || "";
}

async function buildBodyHtml(doc, lang) {
  const intro = await valueFor(`${doc.category}.intro`, lang);
  let html = intro ? `<p>${escapeHtml(intro)}</p>` : "";

  for (const [id, bodyCount, mountCookiePrefs] of doc.sections) {
    const title = await valueFor(`${doc.category}.section.${id}.title`, lang);
    html += `<h2>${escapeHtml(title)}</h2>`;
    for (let i = 0; i < bodyCount; i++) {
      const para = await valueFor(`${doc.category}.section.${id}.body.${i}`, lang);
      if (para) html += `<p>${escapeHtml(para)}</p>`;
    }
    if (mountCookiePrefs) html += `<div id="cookie-prefs-mount"></div>`;
  }
  return html;
}

// Only ever runs once — skips entirely as soon as any Page row exists, so
// content an admin has since edited through the Pages module is never
// touched again by a server restart.
export async function ensurePageDefaults() {
  if ((await Page.count()) > 0) return;

  for (let i = 0; i < DOCS.length; i++) {
    const doc = DOCS[i];
    const englishTitle = (await valueFor(`${doc.category}.title`, "en")) || doc.slug;
    const page = await Page.create({ slug: doc.slug, defaultTitle: englishTitle, sortOrder: i + 1 });

    for (const lang of LANGUAGES) {
      const title = (await valueFor(`${doc.category}.title`, lang)) || englishTitle;
      const bodyHtml = await buildBodyHtml(doc, lang);
      await PageContent.create({ pageId: page.id, languageCode: lang, title, bodyHtml });
    }
  }
}
