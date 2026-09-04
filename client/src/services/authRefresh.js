import axios from "axios";
import { getUserRefreshToken, isRemembered, setUserSession, getStoredUser, clearUserSession } from "../utils/userAuthStorage.js";
import { API_BASE } from "../config.js";

let inFlight = null;

// De-dupes concurrent 401s from multiple requests/axios instances firing
// near-simultaneously into a single /refresh-token call — each rotation
// invalidates the previous refresh token, so naive concurrent refreshes
// would race and the loser would get rejected on an already-rotated token.
// Uses a bare axios.post (not any of the app's wrapped instances) so it can
// never re-enter one of their own 401 interceptors and loop.
export function refreshAccessToken() {
  if (inFlight) return inFlight;

  const refreshToken = getUserRefreshToken();
  if (!refreshToken) return Promise.reject(new Error("No refresh token"));

  const remember = isRemembered();

  inFlight = axios
    .post(`${API_BASE}/users/refresh-token`, { refreshToken })
    .then(({ data }) => {
      setUserSession({ token: data.token, refreshToken: data.refreshToken, user: data.user ?? getStoredUser(), remember });
      return data.token;
    })
    .catch((err) => {
      clearUserSession();
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
