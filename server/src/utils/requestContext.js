import { UAParser } from "ua-parser-js";

// Normalizes the IPv4-mapped IPv6 form Node reports for local/IPv4 clients
// (e.g. "::ffff:127.0.0.1") into the plain, readable form.
function normalizeIp(ip) {
  if (!ip) return null;
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

const DEVICE_TYPE_MAP = { mobile: "mobile", tablet: "tablet" };

// Everything here is derived only from what the request itself carries
// (headers, socket address) — no third-party geo-IP lookup is wired in, so
// `location` is deliberately left null rather than guessed from the IP.
export function getRequestContext(req) {
  // req.ip is Express's own resolution of the client address: with the
  // app's "trust proxy" setting left at its safe default (false), this is
  // just the raw socket peer, so X-Forwarded-For can't be spoofed by the
  // client. Once TRUST_PROXY is configured for a real deployment, Express
  // parses X-Forwarded-For itself, honoring only the trusted hop(s).
  const ipAddress = normalizeIp(req.ip);
  const userAgent = req.headers["user-agent"] || null;

  const parsed = new UAParser(userAgent || "").getResult();

  return {
    ipAddress,
    userAgent,
    browser: parsed.browser.name || null,
    browserVersion: parsed.browser.version || null,
    os: [parsed.os.name, parsed.os.version].filter(Boolean).join(" ") || null,
    deviceType: DEVICE_TYPE_MAP[parsed.device.type] || "desktop",
    deviceName: [parsed.device.vendor, parsed.device.model].filter(Boolean).join(" ") || null,
    location: null,
  };
}
