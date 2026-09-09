// Per-IP sliding-window limiter for POST /api/jobs/public/ai-ask — same
// shape and tradeoffs as faqAskRateLimit.js (not distributed-safe, an
// acceptable v1 tradeoff for a single-instance deployment), kept as its own
// small file rather than sharing faqAskRateLimit's bucket so the Job
// Assistant and the FAQ assistant each have an independent budget per IP.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 15;

const hits = new Map(); // ip -> timestamps[]

export default function jobAiAskRateLimit(req, res, next) {
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
