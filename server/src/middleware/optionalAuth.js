import jwt from "jsonwebtoken";

// Unlike the strict `auth` middleware, this never rejects a request — it just
// decodes `req.user` when a valid token is present, so a route can stay fully
// public while still personalizing its response for a logged-in caller.
export default function optionalAuth(req, res, next) {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // invalid/expired token on an optional route — treat as anonymous
    }
  }
  next();
}
