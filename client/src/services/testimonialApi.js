import api from "./api.js";

export const getTestimonials = (params) => api.get("/testimonials", { params });
