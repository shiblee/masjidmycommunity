import axios from "axios";
import { API_BASE } from "../config.js";

// Fire-and-forget page-view log — call once per masjid open (detail page
// mount, or popup open), never on tab switches within the same open. Never
// blocks or throws: a visitor's page must never wait on, or break because
// of, an analytics call they didn't ask for.
export function trackMasjidView(masjidId, source) {
  axios
    .post(`${API_BASE}/masjids/public/${masjidId}/view`, { source, referrer: document.referrer || null })
    .catch(() => {});
}
