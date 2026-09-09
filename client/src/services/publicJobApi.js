import axios from "axios";
import { getUserToken, clearUserSession } from "../utils/userAuthStorage.js";
import { refreshAccessToken } from "./authRefresh.js";
import { CLIENT_PLATFORM } from "../utils/clientPlatform.js";
import { API_BASE } from "../config.js";

// Public job endpoints (Jobs board/Detail/favorite/liked/mine) — most work
// fine anonymously, but attaching the token when present lets the backend
// personalize responses (e.g. `favorited`, match scores in a later phase)
// and is required for the auth-only ones (favorite, liked/mine). Mirrors
// publicMasjidApi.js exactly.
const publicJobApi = axios.create({
  baseURL: `${API_BASE}/jobs/public`,
});

publicJobApi.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Client-Platform"] = CLIENT_PLATFORM;
  return config;
});

publicJobApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retried) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return publicJobApi(original);
      } catch {
        clearUserSession();
      }
    }
    return Promise.reject(error);
  }
);

export default publicJobApi;
