import { UAParser } from "ua-parser-js";

// Normalizes the IPv4-mapped IPv6 form Node reports for local/IPv4 clients
// (e.g. "::ffff:127.0.0.1") into the plain, readable form, and maps the
// IPv6 loopback address to its familiar IPv4 equivalent — both forms show
// up constantly in local development since the server and browser share
// the same machine.
function normalizeIp(ip) {
  if (!ip) return null;
  if (ip === "::1") return "127.0.0.1";
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

  // Set by the client (see client/src/utils/clientPlatform.js) based on
  // document.referrer — Trusted Web Activity / Custom Tabs launches from the
  // installed Android app set referrer to "android-app://<package>", which
  // is the standard way to detect that launch context without any native
  // code (the Android app itself is a TWA wrapper with no auth code of its
  // own — it just opens this same site in real Chrome).
  const platform = req.headers["x-client-platform"] === "android-twa" ? "android-twa" : "web";

  return {
    ipAddress,
    userAgent,
    platform,
    browser: parsed.browser.name || null,
    browserVersion: parsed.browser.version || null,
    os: [parsed.os.name, parsed.os.version].filter(Boolean).join(" ") || null,
    deviceType: DEVICE_TYPE_MAP[parsed.device.type] || "desktop",
    deviceName: [parsed.device.vendor, parsed.device.model].filter(Boolean).join(" ") || null,
    location: null,
  };
}
