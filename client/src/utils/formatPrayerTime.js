// Every prayer time is stored and transmitted as a 24-hour "HH:mm" string
// (native <input type="time"> format) — this is the one place that turns
// it into a 12-hour "h:mm AM/PM" string for read-only display, so every
// prayer-time surface in the app formats the same way. Never used on the
// admin/owner editing input itself, which needs the raw "HH:mm" value.
export function formatPrayerTime(time) {
  if (!time || typeof time !== "string") return time;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
}
