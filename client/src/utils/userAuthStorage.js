const TOKEN_KEY = "mmc-user-token";
const REFRESH_TOKEN_KEY = "mmc-user-refresh-token";
const USER_KEY = "mmc-user-account";

export function getUserToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getUserRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

// Which storage the current session lives in — used by the refresh flow to
// write rotated tokens back to the same place without re-deriving/hardcoding
// the storage choice.
export function isRemembered() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) !== null;
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserSession({ token, refreshToken, user, remember = true }) {
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(REFRESH_TOKEN_KEY, refreshToken);
  store.setItem(USER_KEY, JSON.stringify(user));
  other.removeItem(TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);
  other.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("mmc-user-session-updated", { detail: user }));
}

// Patches the stored session's user record in place (e.g. after a profile
// field or photo saves) without touching the tokens, so every mounted
// component listening for "mmc-user-session-updated" (the navbar, etc.)
// picks up the change immediately instead of waiting for the next login.
export function updateStoredUser(user) {
  const store = localStorage.getItem(USER_KEY) !== null ? localStorage : sessionStorage.getItem(USER_KEY) !== null ? sessionStorage : null;
  if (store) store.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("mmc-user-session-updated", { detail: user }));
}

export function clearUserSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("mmc-user-session-updated", { detail: null }));
}
