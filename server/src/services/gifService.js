// GIF and Sticker search for the comment composer, backed by GIPHY (same
// key, sibling /gifs and /stickers endpoints — GIPHY's Stickers API returns
// real illustrated/animated sticker art, not just GIFs). Mirrors
// aiProviderService.js's own graceful-degradation convention: the feature
// activates the moment GIPHY_API_KEY is set in the environment, with zero
// further code changes, and every caller already has a "not configured"
// fallback path (an honest empty state, never a fake result).
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE = "https://api.giphy.com/v1";

export function isGifSearchConfigured() {
  return !!GIPHY_API_KEY;
}

async function searchGiphy(kind, query, { limit = 24 } = {}) {
  if (!GIPHY_API_KEY) return null;
  try {
    const trimmed = query?.trim();
    const endpoint = trimmed ? `${GIPHY_BASE}/${kind}/search` : `${GIPHY_BASE}/${kind}/trending`;
    const params = new URLSearchParams({ api_key: GIPHY_API_KEY, limit: String(limit), rating: "pg-13" });
    if (trimmed) params.set("q", trimmed);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${endpoint}?${params.toString()}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;

    const data = await response.json();
    return (data.data || [])
      .map((g) => ({
        id: g.id,
        previewUrl: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url || null,
        url: g.images?.fixed_height?.url || g.images?.original?.url || null,
        width: Number(g.images?.fixed_height?.width) || null,
        height: Number(g.images?.fixed_height?.height) || null,
        alt: g.title || (kind === "stickers" ? "Sticker" : "GIF"),
      }))
      .filter((g) => g.previewUrl && g.url);
  } catch {
    return null;
  }
}

// Only GIPHY's own CDN hosts are ever accepted back as a comment's mediaUrl
// (see createComment/createImageComment) — this is the one place that shape
// of URL is produced, so validation elsewhere can stay a simple allowlist.
export function searchGifs(query, opts) {
  return searchGiphy("gifs", query, opts);
}

export function searchStickers(query, opts) {
  return searchGiphy("stickers", query, opts);
}
