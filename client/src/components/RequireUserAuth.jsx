import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, getUserRefreshToken } from "../utils/userAuthStorage.js";

function RequireUserAuth({ children }) {
  const location = useLocation();
  // A momentarily-expired access token is a recoverable, expected state now
  // (the first API call on this route silently refreshes it) — not a reason
  // to bounce to /auth. Only the absence of a real session is.
  if (!getStoredUser() || !getUserRefreshToken()) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default RequireUserAuth;
