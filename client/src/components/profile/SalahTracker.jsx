import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import userApi from "../../services/userApi.js";
import { Icon } from "../Icons.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";
import { formatPrayerTime } from "../../utils/formatPrayerTime.js";

const HISTORY_DAYS = 7;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Every prayer time on screen is the masjid's own local wall-clock "HH:mm"
// (see formatPrayerTime.js), and the rest of the app already treats it as
// directly comparable to the viewer's own clock (no timezone conversion
// anywhere else in the UI) -- so `new Date()`'s local hour/minute is the
// right "now" to gate against here too.
function isPrayerTimeReached(time) {
  if (!time) return true;
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

function formatDateLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatShortLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// Same sun/moon/drop mapping as the Community Wall's prayer widget, kept as
// its own small copy here rather than shared — matches this codebase's
// convention for tiny per-surface presentation helpers.
function prayerIconFor(name) {
  const key = (name || "").toLowerCase();
  if (key === "isha") return "moon";
  if (key === "maghrib") return "drop";
  return "sun";
}

// Private, personal, respectful-only pool — used whenever the server's
// aiMessage/aiReflection comes back null (AI unconfigured or a transient
// failure), so the celebratory moment is never visibly missing. None of
// these ever compare the user to anyone else, per the feature's "encourage,
// never judge" requirement.
function useFallbackPools() {
  const { t } = useTranslation();
  const daily = [
    t("salah.fallback1", "Alhamdulillah! You completed all five Salah today. May Allah accept your prayers."),
    t("salah.fallback2", "5 / 5 completed — a beautiful day of Salah, insha'Allah it brings ease and barakah."),
    t("salah.fallback3", "Alhamdulillah, every prayer completed today. May Allah make it easy to keep going."),
    t("salah.fallback4", "All five Salah done — may Allah accept them and grant you consistency."),
    t("salah.fallback5", "Alhamdulillah! A complete day of Salah. One day at a time."),
    t("salah.fallback6", "5 / 5 today — may this become a lasting habit, insha'Allah."),
  ];
  return { pickDaily: () => daily[Math.floor(Math.random() * daily.length)] };
}

// `compact`: used in the Community Wall sidebar (a ~280px column) — shows a
// shorter date label and icon-only nav buttons instead of "Previous Day"/
// "Next Day" text, which would wrap awkwardly at that width. The Profile
// page's Primary Masjid tab (much wider) uses the default, fuller labels.
function SalahTracker({ compact = false }) {
  const { t, language } = useTranslation();
  const { pickDaily } = useFallbackPools();

  const [date, setDate] = useState(todayStr());
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyPrayerId, setBusyPrayerId] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState(null);
  const [weekly, setWeekly] = useState(null);

  useEffect(() => {
    setLoading(true);
    userApi
      .get("/me/salah/day", { params: { date } })
      .then(({ data }) => setDay(data))
      .catch(() => setDay(null))
      .finally(() => setLoading(false));
  }, [date]);

  const toggle = async (prayer) => {
    const wasCompleted = prayer.completed;
    if (!wasCompleted && date === todayStr() && !isPrayerTimeReached(prayer.time)) {
      showToast(t("salah.notYetTime", "This prayer's time hasn't started yet."));
      return;
    }

    setBusyPrayerId(prayer.prayerId);
    setDay((d) =>
      d && {
        ...d,
        prayers: d.prayers.map((p) => (p.prayerId === prayer.prayerId ? { ...p, completed: !wasCompleted } : p)),
        completedCount: d.completedCount + (wasCompleted ? -1 : 1),
      }
    );
    try {
      const path = wasCompleted ? "/me/salah/unmark" : "/me/salah/mark";
      const { data } = await userApi.post(path, { prayerId: prayer.prayerId, date, languageCode: language });
      setDay((d) => d && { ...d, prayers: data.prayers, completedCount: data.completedCount, total: data.total });
      if (!wasCompleted && data.completedCount === data.total && date === todayStr()) {
        setCelebration(data.aiMessage || pickDaily());
      }
      // A change today can shift the streak/weekly numbers shown in the
      // already-expanded history panel — refetch it in place rather than
      // leaving stale numbers on screen.
      if (historyOpen) {
        userApi.get("/me/salah/history", { params: { days: HISTORY_DAYS } }).then(({ data: h }) => setHistory(h.days || []));
        userApi.get("/me/salah/weekly-summary", { params: { languageCode: language } }).then(({ data: w }) => setWeekly(w));
      }
    } catch (err) {
      showToast(err.response?.data?.message || t("salah.markFailed", "Couldn't update this prayer."));
      userApi.get("/me/salah/day", { params: { date } }).then(({ data: d }) => setDay(d));
    } finally {
      setBusyPrayerId(null);
    }
  };

  const loadHistory = () => {
    if (history) {
      setHistoryOpen((o) => !o);
      return;
    }
    userApi.get("/me/salah/history", { params: { days: HISTORY_DAYS } }).then(({ data }) => setHistory(data.days || []));
    userApi.get("/me/salah/weekly-summary", { params: { languageCode: language } }).then(({ data }) => setWeekly(data));
    setHistoryOpen(true);
  };

  const isToday = date === todayStr();

  if (loading && !day) {
    return <div className="st-card"><p className="msj-note" style={{ color: "rgba(255,255,255,.8)" }}>{t("masjidWizard.loading", "Loading…")}</p></div>;
  }

  if (day && !day.hasPrimaryMasjid) return null;

  return (
    <>
      <div className={`st-card${compact ? " st-compact" : ""}`}>
        <div className="st-datenav">
          <button type="button" className="st-datenav-btn" onClick={() => setDate((d) => addDays(d, -1))} aria-label={t("salah.dateNav.previous", "Previous Day")}>
            <Icon name="chevronLeft" size={13} /> <span className="st-datenav-btn-label">{t("salah.dateNav.previous", "Previous Day")}</span>
          </button>
          <button type="button" className="st-datenav-date" onClick={() => setDate(todayStr())} disabled={isToday}>
            {compact ? formatShortLabel(date) : formatDateLabel(date)}
            {!isToday && <span className="st-today-pill">{t("salah.dateNav.backToToday", "Back to Today")}</span>}
          </button>
          <button type="button" className="st-datenav-btn" onClick={() => setDate((d) => addDays(d, 1))} disabled={isToday} aria-label={t("salah.dateNav.next", "Next Day")}>
            <span className="st-datenav-btn-label">{t("salah.dateNav.next", "Next Day")}</span> <Icon name="chevronRight" size={13} />
          </button>
        </div>

        {day && (
          <>
            <div className="st-progress">
              <span className="st-progress-label">
                {isToday ? t("salah.todaysSalah", "Today's Salah") : t("salah.selectedDaySalah", "Salah for {date}").replace("{date}", formatShortLabel(date))}
              </span>
              <span className="st-progress-count">{day.completedCount} / {day.total} {t("salah.done", "Done")}</span>
            </div>

            <div className="st-rows">
              {day.prayers.map((p) => (
                <div className="st-row" key={p.prayerId}>
                  <span className="st-row-icon"><Icon name={prayerIconFor(p.name)} size={14} /></span>
                  <span className="st-row-name">{t(`prayer.${p.name.toLowerCase()}`, p.name)}</span>
                  <span className="st-row-time">{formatPrayerTime(p.time)}</span>
                  <button
                    type="button"
                    className={`st-mark-btn${p.completed ? " done" : ""}`}
                    disabled={busyPrayerId === p.prayerId}
                    onClick={() => toggle(p)}
                    aria-label={p.completed ? t("salah.doneLabel", "Done") : t("salah.markDone", "Mark Done")}
                  >
                    <Icon name={p.completed ? "check" : "clock"} size={13} />
                    <span className="st-mark-btn-label">{p.completed ? t("salah.doneLabel", "Done") : t("salah.markDone", "Mark Done")}</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <button type="button" className="st-history-toggle" onClick={loadHistory}>
          {historyOpen ? t("salah.hideHistory", "Hide Salah History") : t("salah.viewHistory", "View Salah History")}
        </button>
      </div>

      {historyOpen && (
        <div className={`cw-side-card st-history${compact ? " st-compact" : ""}`}>
          {weekly && (
            <>
              <div className="st-weekly">
                <div className="st-weekly-tile"><strong>{weekly.completeDays}/{HISTORY_DAYS}</strong><span>{t("salah.weekly.completeDays", "Complete Days")}</span></div>
                <div className="st-weekly-tile"><strong>{weekly.totalCompleted}/{weekly.totalPossible}</strong><span>{t("salah.weekly.totalSalah", "Total Salah")}</span></div>
                <div className="st-weekly-tile"><strong>{weekly.bestDay ? formatShortLabel(weekly.bestDay.date) : "—"}</strong><span>{t("salah.weekly.bestDay", "Best Day")}</span></div>
                <div className="st-weekly-tile"><strong>{weekly.currentStreak}</strong><span>{t("salah.weekly.currentStreak", "Current Streak")}</span></div>
              </div>
              <p className="st-weekly-reflection">
                {weekly.aiReflection || t("salah.weeklyFallback", "You completed all five prayers on {completeDays} of the last {days} days — keep building on this, insha'Allah.").replace("{completeDays}", weekly.completeDays).replace("{days}", HISTORY_DAYS)}
              </p>
            </>
          )}

          {history && (
            <div className="st-history-list">
              {history.map((h) => (
                <div className="st-history-day" key={h.date}>
                  <span className="st-history-date">{formatShortLabel(h.date)}</span>
                  <span className="st-history-marks">
                    {h.prayers.map((p) => (
                      <span key={p.prayerId} className={`st-history-mark${p.completed ? " done" : " pending"}`} title={t(`prayer.${p.name.toLowerCase()}`, p.name)}>
                        {p.completed ? "✓" : "○"}
                      </span>
                    ))}
                  </span>
                  <span className="st-history-count">{h.completedCount}/{h.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast &&
        createPortal(
          <div className="acct-toast"><Icon name="clock" size={16} />{toast}</div>,
          document.body
        )}

      {celebration &&
        createPortal(
          <div className="msj-modal-overlay" onClick={() => setCelebration(null)}>
            <div className="msj-modal st-celebrate" onClick={(e) => e.stopPropagation()}>
              <div className="st-celebrate-badge">✓ {t("salah.celebration.heading", "5 / 5 Completed")}</div>
              <p className="st-celebrate-msg">{celebration}</p>
              <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => setCelebration(null)}>
                {t("salah.celebration.continue", "Continue")}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default SalahTracker;
