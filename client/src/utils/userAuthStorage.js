const TOKEN_KEY = "mmc-user-token";
const USER_KEY = "mmc-user-account";

function decodeExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getUserToken() {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expiresAt = decodeExpiry(token);
  if (expiresAt && expiresAt < Date.now()) {
    clearUserSession();
    return null;
  }
  return token;
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

export function setUserSession({ token, user, remember = true }) {
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("mmc-user-session-updated", { detail: user }));
}

// Patches the stored session's user record in place (e.g. after a profile
// field or photo saves) without touching the token, so every mounted
// component listening for "mmc-user-session-updated" (the navbar, etc.)
// picks up the change immediately instead of waiting for the next login.
export function updateStoredUser(user) {
  const store = localStorage.getItem(USER_KEY) !== null ? localStorage : sessionStorage.getItem(USER_KEY) !== null ? sessionStorage : null;
  if (store) store.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("mmc-user-session-updated", { detail: user }));
}

export function clearUserSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("mmc-user-session-updated", { detail: null }));
}
