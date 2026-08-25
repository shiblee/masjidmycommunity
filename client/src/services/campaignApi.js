import axios from "axios";
import { getUserToken, clearUserSession } from "../utils/userAuthStorage.js";

const campaignApi = axios.create({
  baseURL: "http://localhost:5050/api/campaigns",
});

campaignApi.interceptors.request.use((config) => {
  const token = getUserToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

campaignApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) clearUserSession();
    return Promise.reject(error);
  }
);

export default campaignApi;
