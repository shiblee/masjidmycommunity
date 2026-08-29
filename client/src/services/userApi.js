import axios from "axios";
import { getUserToken, clearUserSession } from "../utils/userAuthStorage.js";
import { API_BASE } from "../config.js";

const userApi = axios.create({
  baseURL: `${API_BASE}/users`,
});

userApi.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearUserSession();
    }
    return Promise.reject(error);
  }
);

export default userApi;
