import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../utils/userAuthStorage.js";

// For a CTA that should only proceed for a signed-in visitor (Explore
// Campaigns, Donate, etc.) — the same ?redirect= round-trip Auth.jsx
// already supports: straight through if already signed in, otherwise to
// sign-in first and back to the same destination afterward.
export function useLoginGatedNav() {
  const navigate = useNavigate();
  return (path) => {
    if (getStoredUser()) navigate(path);
    else navigate(`/auth?redirect=${encodeURIComponent(path)}`);
  };
}
