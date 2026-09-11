import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, getUserRefreshToken } from "../utils/userAuthStorage.js";

function RequireUserAuth({ children }) {
  const location = useLocation();
  // A momentarily-expired access token is a recoverable, expected state now
  // (the first API call on this route silently refreshes it) — not a reason
  // to bounce to /auth. Only the absence of a real session is.
  if (!getStoredUser() || !getUserRefreshToken()) {
    // Same ?redirect= convention useLoginGatedNav and Auth.jsx already use,
    // so signing in lands the visitor back on the page they were blocked from.
    const target = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(target)}`} replace />;
  }
  return children;
}

export default RequireUserAuth;
