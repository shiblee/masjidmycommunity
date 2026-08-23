import axios from "axios";
import { getToken, clearSession } from "../authStorage.js";

const adminApi = axios.create({
  baseURL: "http://localhost:5050/api/admin",
});

adminApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.endsWith("/admin/login")) {
      clearSession();
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

export default adminApi;
