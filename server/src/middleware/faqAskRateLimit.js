// Minimal in-memory per-IP sliding-window limiter, scoped to POST
// /api/faq/ask only. No dependency added — this repo has no rate-limiting
// library and the one metered, paid-API-backed public endpoint doesn't
// warrant pulling one in. Not distributed-safe (resets per process), which
// is an acceptable v1 tradeoff for a single-instance deployment.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 15;

const hits = new Map(); // ip -> timestamps[]

export default function faqAskRateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const timestamps = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({ message: "Too many questions right now — please try again in a few minutes." });
  }

  timestamps.push(now);
  hits.set(ip, timestamps);
  next();
}
