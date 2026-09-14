import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { formatPrayerTime } from "../utils/formatPrayerTime.js";
import { zonedDateStr, zonedTimeToInstant } from "../utils/zonedTime.js";

const BANNER_MS = 8000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function countdownParts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { h: pad2(Math.floor(total / 3600)), m: pad2(Math.floor((total % 3600) / 60)), s: pad2(total % 60) };
}

// Two quick ascending notes with a soft attack/decay -- a small,
// deliberately gentle chime rather than a harsh beep, synthesized with
// Web Audio so the app ships no audio asset (and no licensing question).
function playChime(ctx) {
  if (!ctx) return;
  const start = ctx.currentTime;
  [880, 1318.51].forEach((freq, i) => {
    const t0 = start + i * 0.2;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.22, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 1.2);
  });
}

/**
 * Headless: computes the next upcoming prayer for a masjid with a live,
 * per-second countdown, and fires a sound + visual banner + (opt-in)
 * browser Notification at the exact scheduled instant. No rendering of its
 * own -- callers merge `next`/`h,m,s`/`alarmOn` straight into whichever
 * prayer's own row/tile they're already displaying, rather than showing a
 * second, duplicate "next prayer" surface.
 *
 * Data-source agnostic: the caller hands it today's already-resolved
 * roster and a `fetchRoster(date)` loader, so it works the same way
 * against the public masjid endpoint and the authenticated personal Salah
 * endpoint.
 *
 * Every prayer's absolute instant is computed once from `timezone` (the
 * masjid's own IANA zone) via zonedTimeToInstant, so "now >= instant" is a
 * real, timezone-correct comparison -- never an approximate countdown that
 * just reached zero. Midnight/day rollover falls out of that naturally:
 * once every loaded prayer's instant is in the past, the next day's roster
 * is fetched on demand (and pre-fetched a little ahead of time so the
 * transition has nothing to wait on).
 */
export function useNextPrayer({ masjidId, timezone, todayDateStr, todayRoster, fetchRoster, enabled = true }) {
  const { t } = useTranslation();
  const storageKey = `mmc-prayer-alarm-${masjidId}`;

  // `todayDateStr` can still be null on the very first render for callers
  // whose own data (and so masjid/date) only resolves after their own
  // fetch -- seeding a `{ null: [...] }` entry would leave a literal
  // "null" key sitting in `days` (object keys are always strings), which
  // the lookahead effect below would later try to parse as a real date and
  // crash on. An empty cache is the correct starting point for that case;
  // the bootstrap effect fills it in for real once `enabled` turns true.
  const [days, setDays] = useState(() => (todayDateStr ? { [todayDateStr]: (todayRoster || []).filter((p) => p.time) } : {}));
  const [now, setNow] = useState(() => Date.now());
  const [alarmOn, setAlarmOn] = useState(true);
  const [banner, setBanner] = useState(null);

  // `masjidId` (and so `storageKey`) isn't always known synchronously --
  // some callers pass it down only once their own data finishes loading.
  // Re-reading here whenever it changes (rather than only once via a lazy
  // useState initializer) means a masjid that becomes known after the
  // first render still gets its real saved preference instead of being
  // stuck on the optimistic default.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setAlarmOn(saved === null ? true : saved === "1");
    } catch {
      setAlarmOn(true);
    }
  }, [storageKey]);
  const [notifPermission, setNotifPermission] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));

  const audioCtxRef = useRef(null);
  const fetchingRef = useRef(null);
  const lastCheckRef = useRef(Date.now());
  const bannerTimerRef = useRef(null);

  // A different masjid (or a genuinely new "today", e.g. left the tab open
  // past midnight) resets the whole cache -- otherwise a stale masjid's
  // schedule could briefly flash before the caller's own re-fetch lands.
  //
  // `todayDateStr` is trusted as a seed only when it actually matches the
  // masjid's own local calendar date. Some callers compute "today" from
  // the viewer's own clock rather than the masjid's timezone, which can
  // disagree with the masjid's real "today" -- exactly the boundary this
  // hook exists to get right, so a mismatch always re-fetches the correct
  // day itself instead of trusting a possibly-off-by-one-day roster.
  useEffect(() => {
    if (!enabled) return;
    const trueToday = zonedDateStr(timezone);
    lastCheckRef.current = Date.now();
    if (todayDateStr === trueToday) {
      setDays({ [trueToday]: (todayRoster || []).filter((p) => p.time) });
      return;
    }
    setDays({});
    fetchRoster(trueToday)
      .then((roster) => setDays({ [trueToday]: (roster || []).filter((p) => p.time) }))
      .catch(() => setDays({ [trueToday]: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, masjidId, timezone, todayDateStr, todayRoster]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);

  const schedule = useMemo(() => {
    const entries = [];
    for (const dateStr of Object.keys(days).sort()) {
      for (const p of days[dateStr]) {
        entries.push({ key: `${dateStr}-${p.prayerId}`, dateStr, prayerId: p.prayerId, name: p.name, time: p.time, instant: zonedTimeToInstant(dateStr, p.time, timezone) });
      }
    }
    entries.sort((a, b) => a.instant - b.instant);
    return entries;
  }, [days, timezone]);

  const next = useMemo(() => schedule.find((e) => e.instant.getTime() > now) || null, [schedule, now]);

  // Keep a day's worth of lookahead loaded so the midnight rollover (or any
  // "last prayer of the day just passed") never has to wait on a fetch:
  // fetch the day after whatever we currently hold as soon as "next" is
  // down to the last already-loaded entry (or exhausted entirely).
  useEffect(() => {
    if (!enabled) return;
    const lastLoadedDate = Object.keys(days).sort().pop();
    if (!lastLoadedDate || !/^\d{4}-\d{2}-\d{2}$/.test(lastLoadedDate)) return;
    const stillHasBuffer = next && schedule.length && schedule[schedule.length - 1].key !== next.key;
    if (stillHasBuffer) return;

    const after = new Date(`${lastLoadedDate}T00:00:00Z`);
    after.setUTCDate(after.getUTCDate() + 1);
    const nextDateStr = after.toISOString().slice(0, 10);
    if (days[nextDateStr] || fetchingRef.current === nextDateStr) return;

    fetchingRef.current = nextDateStr;
    fetchRoster(nextDateStr)
      .then((roster) => setDays((d) => ({ ...d, [nextDateStr]: (roster || []).filter((p) => p.time) })))
      .catch(() => setDays((d) => ({ ...d, [nextDateStr]: [] })))
      .finally(() => {
        fetchingRef.current = null;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, schedule, next, days]);

  const unlockAudio = () => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
      return audioCtxRef.current;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtxRef.current = new Ctx();
    return audioCtxRef.current;
  };

  const toggleAlarm = () => {
    const willBeOn = !alarmOn;
    setAlarmOn(willBeOn);
    try {
      localStorage.setItem(storageKey, willBeOn ? "1" : "0");
    } catch {
      // Private-browsing / storage-blocked -- the toggle still works for this session.
    }
    unlockAudio();
    if (willBeOn && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then(setNotifPermission);
    }
  };

  const requestNotifPermission = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifPermission);
  };

  // Fires once per prayer, exactly when its instant is crossed -- compares
  // against the wall-clock window since the last tick (not equality with
  // "now"), so a throttled/backgrounded tab that skips a second or two
  // still catches the prayer it crossed rather than missing it entirely.
  useEffect(() => {
    if (!enabled) return;
    const justPassed = schedule.filter((e) => e.instant.getTime() > lastCheckRef.current && e.instant.getTime() <= now);
    lastCheckRef.current = now;
    if (!justPassed.length || !alarmOn) return;
    const entry = justPassed[justPassed.length - 1];
    const name = t(`prayer.${entry.name.toLowerCase()}`, entry.name);

    playChime(unlockAudio());

    setBanner(t("prayer.next.bannerText", "It's time for {name}.").replace("{name}", name));
    clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setBanner(null), BANNER_MS);

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification(name, { body: `${formatPrayerTime(entry.time)} — ${t("prayer.next.notifBody", "prayer time has begun.")}`, tag: entry.key });
      } catch {
        // Some embedded/webview contexts throw on `new Notification` even
        // when permission reads "granted" -- the in-page banner already covers it.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, now, schedule, alarmOn]);

  useEffect(() => () => clearTimeout(bannerTimerRef.current), []);

  const { h, m, s } = countdownParts(next ? next.instant.getTime() - now : 0);

  return { next, h, m, s, alarmOn, toggleAlarm, unlockAudio, banner, notifPermission, requestNotifPermission };
}

export default useNextPrayer;
