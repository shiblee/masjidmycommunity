import api from "./api.js";

const SESSION_KEY = "mmc-faq-session-id";

// A per-browser id, not an auth concept — it only scopes the anonymous
// feedback PATCH to the row that created it. Generated once and reused.
export function getFaqSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export const getFaqs = (params) => api.get("/faq", { params });

export const askAi = (payload) => api.post("/faq/ask", payload);

export const sendAiFeedback = (logId, feedback) =>
  api.patch(`/faq/ask/${logId}/feedback`, { feedback, sessionId: getFaqSessionId() });
