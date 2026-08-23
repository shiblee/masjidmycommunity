const TOKEN_KEY = "mmc-admin-token";
const USER_KEY = "mmc-admin-user";

function decodeExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expiresAt = decodeExpiry(token);
  if (expiresAt && expiresAt < Date.now()) {
    clearSession();
    return null;
  }
  return token;
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession({ token, user, remember }) {
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify(user));
  other.removeItem(TOKEN_KEY);
  other.removeItem(USER_KEY);
}

export function updateStoredUser(user) {
  const inLocal = !!localStorage.getItem(TOKEN_KEY);
  const store = inLocal ? localStorage : sessionStorage;
  store.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("mmc-admin-user-updated", { detail: user }));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
