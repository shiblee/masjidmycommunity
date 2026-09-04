import { Navigate } from "react-router-dom";
import { getStoredUser } from "../utils/userAuthStorage.js";

// /account is retired as its own page — the redesigned profile at
// /profile/:username absorbs both the old settings editor and the
// "Continue your journey" CTAs. This keeps every existing /account link
// (bookmarks, the navbar menu) working by bouncing to the owner's own page.
function AccountRedirect() {
  const user = getStoredUser();
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={`/profile/${user.username}`} replace />;
}

export default AccountRedirect;
