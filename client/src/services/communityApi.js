import axios from "axios";
import { getUserToken, clearUserSession } from "../utils/userAuthStorage.js";
import { API_BASE } from "../config.js";

const communityApi = axios.create({
  baseURL: `${API_BASE}/community`,
});

communityApi.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

communityApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) clearUserSession();
    return Promise.reject(error);
  }
);

export default communityApi;
