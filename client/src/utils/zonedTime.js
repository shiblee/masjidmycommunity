// Converts between a masjid's own wall-clock prayer times ("HH:mm" on a
// given "YYYY-MM-DD") and absolute instants, entirely with the built-in
// Intl API -- no timezone library exists in this app (server-side mirrors
// the same Intl-only approach, see prayerCalculationEngine.js's
// formatLocalHHmm / prayerTimeService.js's todayInTimezone).

// "YYYY-MM-DD" for `timeZone`'s current wall-clock date, optionally offset
// by whole days first (e.g. offsetDays: 1 for "tomorrow, there").
export function zonedDateStr(timeZone, offsetDays = 0) {
  const instant = new Date(Date.now() + offsetDays * 86400000);
  if (!timeZone) return instant.toISOString().slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
    const get = (type) => parts.find((p) => p.type === type).value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

// The absolute instant (a real Date, comparable to `new Date()` from
// anywhere) at which a "HH:mm" wall-clock time on `dateStr` occurs in
// `timeZone`. Standard round-trip trick: guess the instant by reading the
// wall-clock fields as if they were UTC, see what that guess actually
// renders as in the target zone, and correct by the difference -- exact
// for any date/zone in one pass except inside the single hour of a DST
// transition, which prayer times essentially never land on.
export function zonedTimeToInstant(dateStr, timeStr, timeZone) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  if (!timeZone) return new Date(guessUtc);

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(guessUtc));
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    const renderedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    return new Date(guessUtc + (guessUtc - renderedAsUtc));
  } catch {
    return new Date(guessUtc);
  }
}
