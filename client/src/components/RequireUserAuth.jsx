import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUserToken } from "../utils/userAuthStorage.js";

function RequireUserAuth({ children }) {
  const token = getUserToken();
  const location = useLocation();
  if (!token) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return children;
}

export default RequireUserAuth;
