import api from "./api.js";

export const getSuccessStories = (params) => api.get("/success-stories", { params });

export const getSuccessStory = (slug, params) => api.get(`/success-stories/${slug}`, { params });
