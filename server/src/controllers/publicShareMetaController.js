import fs from "fs";
import path from "path";
import MasjidPhoto from "../models/MasjidPhoto.js";
import { findPublicMasjidByParam } from "../utils/findMasjidBySlugOrId.js";

// The built SPA's index.html — used as a template for a specific masjid's
// page, not replaced by it. Read once and cached; a stale cache after a
// redeploy just means a process restart (pm2 restart, which the deploy
// workflow already does) picks up the new build.
const DIST_INDEX = path.resolve("../client/dist/index.html");
let templateCache = null;
function template() {
  if (!templateCache) templateCache = fs.readFileSync(DIST_INDEX, "utf-8");
  return templateCache;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Social-share crawlers (WhatsApp, Facebook, X/Twitter, LinkedIn...) read
// og:/twitter: meta tags from the raw HTML at a URL — they never run the
// SPA's JS, so the plain, generic tags in index.html are all they ever see,
// regardless of which masjid the link actually points to. This renders the
// same SPA shell (same <div id="root">, same script tag — a real visitor's
// browser boots the app exactly as before) but with per-masjid title/
// description/image swapped into <head> first, so a shared link's preview
// card actually shows that masjid's own name and photo.
//
// IMPORTANT — this route only takes effect once nginx proxies /masjid/:id
// requests to this backend instead of serving the static SPA file directly
// (the same wiring /sitemap.xml assumes, in app.js, but which was never
// actually added — see app.js's comment on that route). Without that nginx
// rule, this handler is dead code that nothing ever reaches.
export const renderMasjidSharePage = async (req, res, next) => {
  try {
    const masjid = await findPublicMasjidByParam(req.params.id, { status: "approved", moderationStatus: "active" });
    // Unknown/unapproved id or slug — still serve the plain SPA shell
    // (unmodified), never a raw Express 404. The React app's own
    // MasjidProfile.jsx already renders a proper "This masjid isn't
    // available" state for exactly this case; a bare 404 here would only
    // replace that with an ugly plain-text error page for a real visitor.
    if (!masjid) return res.set("Content-Type", "text/html").send(template());

    // Derived from the actual incoming request rather than a SITE_URL env
    // var — the exact host a crawler used to reach this page is always
    // correct, whereas trusting a separately-configured env var risks
    // silently pointing og:image at the wrong domain if it's ever unset or
    // stale (as publicSitemapController.js's SITE_URL default, still
    // ".org", would have here — this app is served from ".com").
    const origin = `${req.protocol}://${req.get("host")}`;
    const cover = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true }, attributes: ["url"] });
    const imageUrl = cover ? `${origin}${cover.url}` : `${origin}/icons/icon-512.png`;
    // Admin-set/AI-generated SEO fields (see the admin SEO tab and
    // aiProviderService.js's generateSeoMeta) take priority when present;
    // otherwise fall back to plain facts about the masjid.
    const title = masjid.metaTitle || `${masjid.name} — Masjid My Community`;
    const description = (
      masjid.metaDescription ||
      masjid.about ||
      masjid.tagline ||
      "View this masjid's profile, prayer times, and community on Masjid My Community."
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
    // The canonical slug URL even when this request arrived via a legacy
    // numeric-id link — so a crawler indexes/shares the one true URL.
    const pageUrl = `${origin}/masjid/${masjid.slug || masjid.id}`;

    const metaTags = `
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`;

    const html = template()
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta name="description"[^>]*\/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
      .replace("</head>", `${metaTags}\n  </head>`);

    res.set("Content-Type", "text/html").send(html);
  } catch (error) {
    next(error);
  }
};
