import axios from "axios";
import { getUserToken, clearUserSession } from "../utils/userAuthStorage.js";
import { refreshAccessToken } from "./authRefresh.js";
import { CLIENT_PLATFORM } from "../utils/clientPlatform.js";
import { API_BASE } from "../config.js";

const communityApi = axios.create({
  baseURL: `${API_BASE}/community`,
});

communityApi.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Client-Platform"] = CLIENT_PLATFORM;
  return config;
});

const AUTH_ENDPOINTS = ["/login", "/register", "/verify-otp", "/refresh-token"];

communityApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => original?.url?.includes(p));
    if (error.response?.status === 401 && !isAuthEndpoint && !original?._retried) {
      original._retried = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return communityApi(original);
      } catch {
        clearUserSession();
      }
    }
    return Promise.reject(error);
  }
);

export default communityApi;
