import crypto from "crypto";

const COOKIE_NAME = "mmc_vid";
const MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000; // 400 days — Chrome's own cap on cookie lifetime

// Mounted only on the visitor-tracking router (not app-wide) so no other
// endpoint ever sets a cookie a visitor didn't ask for. httpOnly since
// client JS never needs to read this value itself (the server is the only
// thing that ever looks a visitor up by it); sameSite=lax survives normal
// top-level navigation while still blocking cross-site abuse.
export function visitorCookie(req, res, next) {
  let key = req.cookies?.[COOKIE_NAME];
  let isNewCookie = false;
  if (!key) {
    key = crypto.randomUUID();
    isNewCookie = true;
    res.cookie(COOKIE_NAME, key, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_MS,
    });
  }
  req.visitorKey = key;
  req.isNewVisitorCookie = isNewCookie;
  next();
}
