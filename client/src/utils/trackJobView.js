import axios from "axios";
import { API_BASE } from "../config.js";

// Fire-and-forget page-view log — call once per job open (detail page
// mount), never on tab switches within the same open. Never blocks or
// throws: a visitor's page must never wait on, or break because of, an
// analytics call they didn't ask for. Mirrors trackMasjidView.js.
export function trackJobView(jobId) {
  axios.post(`${API_BASE}/jobs/public/${jobId}/view`).catch(() => {});
}
