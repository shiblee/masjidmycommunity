// Single shared date/time format for the whole app — "26 Aug 2026" for a
// date alone, "26 Aug 2026, 12:53 AM" for date + time. Renders in the
// viewer's local timezone (the browser's Intl default), same as every
// timestamp already displayed across the app.
export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const formatted = new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  // en-GB renders the AM/PM suffix lowercase; the rest of the app's copy
  // (and the agreed format) is uppercase.
  return formatted.replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
}
