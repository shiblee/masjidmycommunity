import axios from "axios";
import { getUserToken, clearUserSession } from "../utils/userAuthStorage.js";
import { refreshAccessToken } from "./authRefresh.js";
import { CLIENT_PLATFORM } from "../utils/clientPlatform.js";
import { API_BASE } from "../config.js";

// Public masjid endpoints (Explore/Detail/Nearby/Liked/favorite/reviews) —
// most work fine anonymously, but attaching the token when present lets the
// backend personalize responses (e.g. `likedByMe`) and is required for the
// handful of auth-only ones (favorite, liked/mine). One shared instance so
// every screen that talks to `/masjids/public` behaves identically, instead
// of each component hitting raw axios on its own.
const publicMasjidApi = axios.create({
  baseURL: `${API_BASE}/masjids/public`,
});

publicMasjidApi.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Client-Platform"] = CLIENT_PLATFORM;
  return config;
});

publicMasjidApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retried) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return publicMasjidApi(original);
      } catch {
        clearUserSession();
      }
    }
    return Promise.reject(error);
  }
);

export default publicMasjidApi;
