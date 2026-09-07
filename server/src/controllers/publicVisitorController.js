import { getRequestContext } from "../utils/requestContext.js";
import { recordPageView, recordHeartbeat, endSession } from "../services/visitorTrackingService.js";
import { getPublicTotal } from "../services/visitorStatsService.js";
import { addPublicClient } from "../services/visitorRealtimeService.js";

// Every handler here responds the same way regardless of what actually
// happened internally (disabled tracking, detected bot, consent declined
// client-side before ever calling this) — a visitor's own experience must
// never depend on, wait for, or break because of analytics.

export const track = async (req, res) => {
  try {
    const { path, title, referrer, utmSource, utmMedium, utmCampaign, screenWidth, timezone, language } = req.body || {};
    if (!path) return res.status(204).end();
    await recordPageView({
      visitorKey: req.visitorKey,
      path, title, referrer, utmSource, utmMedium, utmCampaign, screenWidth, timezone, language,
      requestContext: getRequestContext(req),
      userId: req.user?.id,
    });
  } catch (error) {
    console.error("Visitor track failed:", error.message);
  }
  res.status(204).end();
};

export const heartbeat = async (req, res) => {
  try {
    await recordHeartbeat({ visitorKey: req.visitorKey });
  } catch (error) {
    console.error("Visitor heartbeat failed:", error.message);
  }
  res.status(204).end();
};

// Reached via navigator.sendBeacon(url, new Blob([json], {type:
// "application/json"})) on page unload — the Blob's own type header makes
// Express's globally-mounted express.json() parse it exactly like a normal
// fetch/axios call, no special handling needed. Best-effort only: the
// visitor's cookie is what identifies the session, not anything in the body.
export const end = async (req, res) => {
  try {
    await endSession({ visitorKey: req.visitorKey });
  } catch (error) {
    console.error("Visitor end failed:", error.message);
  }
  res.status(204).end();
};

export const getCount = async (req, res) => {
  try {
    const total = await getPublicTotal();
    res.json({ total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const stream = async (req, res) => {
  const total = await getPublicTotal();
  const accepted = addPublicClient(req, res, total);
  if (!accepted) res.status(503).end();
};
