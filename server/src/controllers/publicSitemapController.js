import Masjid from "../models/Masjid.js";
import Campaign from "../models/Campaign.js";
import SuccessStory from "../models/SuccessStory.js";

const CAMPAIGN_PUBLIC_STATUSES = ["active", "paused", "goal_reached", "completed"];

// [path, changefreq, priority] — every static, non-parameterized public page.
// Excludes /auth (covered by "/"), account/admin routes, and legal pages
// bundled inside /pages/:slug (those aren't a fixed, enumerable list here).
const STATIC_PAGES = [
  ["/", "weekly", "1.0"],
  ["/how-it-works", "monthly", "0.8"],
  ["/explore-campaigns", "monthly", "0.8"],
  ["/verified-masjid", "monthly", "0.8"],
  ["/our-impact", "weekly", "0.8"],
  ["/about", "monthly", "0.6"],
  ["/explore-masjids", "daily", "0.8"],
  ["/success-stories", "weekly", "0.7"],
  ["/testimonials", "weekly", "0.6"],
  ["/faq", "monthly", "0.5"],
  ["/contact", "yearly", "0.4"],
  ["/raise-a-concern", "yearly", "0.3"],
  ["/terms", "yearly", "0.2"],
  ["/privacy", "yearly", "0.2"],
  ["/cookie-policy", "yearly", "0.2"],
  ["/sitemap", "monthly", "0.3"],
];

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

function urlEntry(origin, path, { changefreq, priority, lastmod } = {}) {
  const loc = `${origin}${path}`;
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const getSitemapXml = async (req, res) => {
  try {
    // Derived from the actual incoming request rather than a separately-
    // configured SITE_URL env var, same reasoning as publicShareMetaController.js
    // — a stale/unset env var previously left this sitemap listing the
    // wrong domain (masjidmycommunity.org) for a site actually served from
    // .com, with no way to notice short of reading the generated XML.
    const origin = `${req.protocol}://${req.get("host")}`;
    const [masjids, campaigns, stories] = await Promise.all([
      Masjid.findAll({ where: { status: "approved", moderationStatus: "active" }, attributes: ["id", "slug", "updatedAt"] }),
      Campaign.findAll({ where: { status: CAMPAIGN_PUBLIC_STATUSES, moderationStatus: "active" }, attributes: ["slug", "updatedAt"] }),
      SuccessStory.findAll({ where: { isActive: true }, attributes: ["slug", "updatedAt"] }),
    ]);

    const entries = [
      ...STATIC_PAGES.map(([path, changefreq, priority]) => urlEntry(origin, path, { changefreq, priority })),
      ...masjids.map((m) => urlEntry(origin, `/masjid/${m.slug || m.id}`, { changefreq: "weekly", priority: "0.6", lastmod: m.updatedAt })),
      ...campaigns.map((c) => urlEntry(origin, `/campaign/${c.slug}`, { changefreq: "daily", priority: "0.7", lastmod: c.updatedAt })),
      ...stories.map((s) => urlEntry(origin, `/success-stories/${s.slug}`, { changefreq: "monthly", priority: "0.6", lastmod: s.updatedAt })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
