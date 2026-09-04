import axios from "axios";
import { getUserToken, clearUserSession } from "../utils/userAuthStorage.js";
import { refreshAccessToken } from "./authRefresh.js";
import { CLIENT_PLATFORM } from "../utils/clientPlatform.js";
import { API_BASE } from "../config.js";

const userApi = axios.create({
  baseURL: `${API_BASE}/users`,
});

userApi.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Client-Platform"] = CLIENT_PLATFORM;
  return config;
});

// Endpoints that legitimately 401/400 on their own (bad credentials, a dead
// refresh token) must never trigger another refresh attempt themselves —
// otherwise a failed /refresh-token call would try to refresh itself.
const AUTH_ENDPOINTS = ["/login", "/register", "/verify-otp", "/refresh-token"];

userApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => original?.url?.includes(p));
    if (error.response?.status === 401 && !isAuthEndpoint && !original?._retried) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return userApi(original);
      } catch {
        clearUserSession();
      }
    }
    return Promise.reject(error);
  }
);

export default userApi;
