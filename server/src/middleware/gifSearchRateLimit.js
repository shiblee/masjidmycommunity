// Minimal in-memory per-IP sliding-window limiter, same pattern as
// faqAskRateLimit.js — GIPHY's free tier is quota-limited and a live-search
// composer can fire a request per keystroke, so this caps that fan-out
// without pulling in a rate-limiting library for one endpoint.
const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS = 60;

const hits = new Map(); // ip -> timestamps[]

export default function gifSearchRateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({ message: "Too many GIF searches right now — please try again in a few minutes." });
  }

  timestamps.push(now);
  hits.set(ip, timestamps);
  next();
}
