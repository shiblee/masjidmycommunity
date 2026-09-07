import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/Icons.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const SOURCE_META = {
  set: { label: "Set on This Date", cls: "set" },
  carried: { label: "Carried Forward", cls: "carried" },
  none: { label: "Not Set", cls: "none" },
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

function formatDateShort(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

function monthOf(dateStr) {
  const [year, month] = dateStr.split("-").map(Number);
  return { year, month };
}

function formatMonthLabel(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "long", year: "numeric", timeZone: "UTC",
  });
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function firstWeekdayOfMonth(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Reused as-is for the admin "Prayer Times" tab by pointing `api` at the
// admin-authenticated axios instance instead of masjidApi — the effective-
// time computation (continuous, year-over-year inherited timeline) always
// comes from the same server-side service either way.
function PrayerRosterSection({ basePath, api }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayStr);
  const [view, setView] = useState("list");
  const [roster, setRoster] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(() => monthOf(todayStr()));
  const [changeDates, setChangeDates] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [verifyModal, setVerifyModal] = useState(null); // { warnings, entries } | null
  const [verifyBusy, setVerifyBusy] = useState(false);

  const loadRoster = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get(`${basePath}/prayer-times`, { params: { date } })
      .then(({ data }) => {
        setRoster(data.roster);
        setDrafts(Object.fromEntries(data.roster.map((r) => [r.prayerId, r.time || ""])));
      })
      .catch(() => setError("Couldn't load prayer times for this date."))
      .finally(() => setLoading(false));
  }, [api, basePath, date]);

  useEffect(() => {
    loadRoster();
    setNotice("");
  }, [loadRoster]);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    api
      .get(`${basePath}/prayer-times/history`)
      .then(({ data }) => setHistory(data.entries))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [api, basePath]);

  useEffect(() => {
    if (historyOpen) loadHistory();
  }, [historyOpen, loadHistory]);

  const loadChangeDates = useCallback(() => {
    api
      .get(`${basePath}/prayer-times/changes`, { params: { year: calMonth.year, month: calMonth.month } })
      .then(({ data }) => setChangeDates(data.dates))
      .catch(() => {});
  }, [api, basePath, calMonth]);

  useEffect(() => {
    if (view === "calendar") loadChangeDates();
  }, [view, loadChangeDates]);

  const save = async () => {
    const entries = roster
      .filter((r) => drafts[r.prayerId] && drafts[r.prayerId] !== r.time)
      .map((r) => ({ prayerId: r.prayerId, time: drafts[r.prayerId] }));
    if (!entries.length) {
      setNotice("No changes to save.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    setRowErrors({});
    try {
      const { data } = await api.put(`${basePath}/prayer-times`, { date, entries });
      if (data.saved === false) {
        setVerifyModal({ warnings: data.warnings, entries });
        return;
      }
      setRoster(data.roster);
      setNotice("Prayer times saved.");
      if (historyOpen) loadHistory();
      if (view === "calendar") loadChangeDates();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (err.response?.status === 422 && Array.isArray(errs)) {
        setRowErrors(Object.fromEntries(errs.map((e) => [e.prayerId, e.message])));
        setError("Invalid Prayer Time — see the highlighted field(s) below.");
      } else {
        setError(err.response?.data?.message || "Couldn't save prayer times.");
      }
    } finally {
      setSaving(false);
    }
  };

  const closeVerifyModal = () => {
    if (verifyBusy) return;
    setVerifyModal(null);
  };

  const confirmSaveAnyway = async () => {
    if (!verifyModal) return;
    setVerifyBusy(true);
    try {
      const { data } = await api.put(`${basePath}/prayer-times`, { date, entries: verifyModal.entries, confirmWarnings: true });
      setRoster(data.roster);
      setNotice("Prayer times saved.");
      setVerifyModal(null);
      if (historyOpen) loadHistory();
      if (view === "calendar") loadChangeDates();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (err.response?.status === 422 && Array.isArray(errs)) {
        setRowErrors(Object.fromEntries(errs.map((e) => [e.prayerId, e.message])));
      }
      setError(err.response?.data?.message || "Couldn't save prayer times.");
      setVerifyModal(null);
    } finally {
      setVerifyBusy(false);
    }
  };

  const hasDrafts = roster.some((r) => drafts[r.prayerId] && drafts[r.prayerId] !== r.time);

  const calDays = daysInMonth(calMonth.year, calMonth.month);
  const calLeadBlanks = firstWeekdayOfMonth(calMonth.year, calMonth.month);
  const changeDateSet = new Set(changeDates);

  return (
    <div className="msj-summary-block msj-prayer-section">
      <div className="msj-summary-head">
        <h4><Icon name="clock" size={15} /> Prayer Time Management</h4>
        <div className="msj-prayer-headactions">
          <div className="msj-prayer-viewtoggle">
            <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
              <Icon name="list" size={14} /> List
            </button>
            <button type="button" className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>
              <Icon name="calendar" size={14} /> Calendar
            </button>
          </div>
          <button type="button" onClick={() => setHistoryOpen((v) => !v)}>
            {historyOpen ? "Hide changes" : "Recent changes"}
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="msj-prayer-calendar">
          <div className="msj-prayer-calendar-head">
            <button type="button" className="msj-prayer-daybtn" onClick={() => setCalMonth((m) => (m.month === 1 ? { year: m.year - 1, month: 12 } : { year: m.year, month: m.month - 1 }))} aria-label="Previous month">
              <Icon name="chevronLeft" size={16} />
            </button>
            <strong>{formatMonthLabel(calMonth.year, calMonth.month)}</strong>
            <button type="button" className="msj-prayer-daybtn" onClick={() => setCalMonth((m) => (m.month === 12 ? { year: m.year + 1, month: 1 } : { year: m.year, month: m.month + 1 }))} aria-label="Next month">
              <Icon name="chevronRight" size={16} />
            </button>
          </div>
          <div className="msj-prayer-calendar-weekdays">
            {WEEKDAY_LABELS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="msj-prayer-calendar-grid">
            {Array.from({ length: calLeadBlanks }).map((_, i) => <span key={`blank-${i}`} className="msj-prayer-cal-blank" />)}
            {Array.from({ length: calDays }).map((_, i) => {
              const day = i + 1;
              const dayStr = `${calMonth.year}-${pad2(calMonth.month)}-${pad2(day)}`;
              const hasChange = changeDateSet.has(dayStr);
              const isSelected = dayStr === date;
              const isToday = dayStr === todayStr();
              return (
                <button
                  type="button"
                  key={dayStr}
                  className={`msj-prayer-cal-day${hasChange ? " has-change" : ""}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
                  onClick={() => { setDate(dayStr); setView("list"); }}
                  title={hasChange ? "A prayer time was set on this date" : undefined}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="msj-prayer-calendar-legend">
            <span><i className="msj-prayer-legend-dot has-change" /> Prayer time set on this date</span>
          </div>
        </div>
      ) : (
        <>
          <div className="msj-prayer-datebar">
            <button type="button" className="msj-prayer-daybtn" onClick={() => setDate((d) => shiftDate(d, -1))} aria-label="Previous day">
              <Icon name="chevronLeft" size={16} />
            </button>
            <div className="msj-prayer-dateinput">
              <Icon name="calendar" size={15} />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <button type="button" className="msj-prayer-daybtn" onClick={() => setDate((d) => shiftDate(d, 1))} aria-label="Next day">
              <Icon name="chevronRight" size={16} />
            </button>
            {date !== todayStr() && (
              <button type="button" className="msj-prayer-today" onClick={() => setDate(todayStr())}>Today</button>
            )}
            <span className="msj-prayer-datelabel">{formatDateLabel(date)}</span>
          </div>

          {error && <span className="auth-field-error" style={{ display: "block", marginBottom: 10 }}>{error}</span>}
          {notice && <span className="msj-prayer-notice">{notice}</span>}

          {loading ? (
            <p>Loading prayer times…</p>
          ) : roster.length === 0 ? (
            <p>No active prayers are configured yet. Please check back once the admin sets these up.</p>
          ) : (
            <div className="msj-prayer-rows">
              {roster.map((r) => {
                const meta = SOURCE_META[r.source] || SOURCE_META.none;
                const rowError = rowErrors[r.prayerId];
                return (
                  <div className={`msj-prayer-row${rowError ? " has-error" : ""}`} key={r.prayerId}>
                    <div className="msj-prayer-row-name">
                      <strong>{t(`prayer.${r.name.toLowerCase()}`, r.name)}</strong>
                      {r.category && <span className="msj-prayer-cat">{r.category}</span>}
                    </div>
                    <input
                      type="time"
                      className="msj-prayer-time"
                      value={drafts[r.prayerId] || ""}
                      onChange={(e) => {
                        setDrafts((d) => ({ ...d, [r.prayerId]: e.target.value }));
                        setRowErrors((er) => (er[r.prayerId] ? { ...er, [r.prayerId]: null } : er));
                      }}
                    />
                    <span className={`msj-prayer-badge msj-prayer-badge-${meta.cls}`}>
                      {meta.label}
                      {r.source === "carried" && r.originDate && ` since ${formatDateShort(r.originDate)}`}
                    </span>
                    <span className="msj-prayer-updated">
                      {r.updatedAt ? `Updated ${new Date(r.updatedAt).toLocaleDateString()}` : "Not set"}
                    </span>
                    {rowError && <span className="msj-prayer-row-error">{rowError}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {roster.length > 0 && (
            <div className="msj-prayer-savebar">
              <p className="msj-prayer-savehint">
                Saving applies from <strong>{formatDateShort(date)}</strong> onward, until you change it again.
              </p>
              <button type="button" className="btn btn-gold" onClick={save} disabled={saving || !hasDrafts}>
                {saving ? "Saving…" : "Save Prayer Times"}
              </button>
            </div>
          )}
        </>
      )}

      {historyOpen && (
        <div className="msj-prayer-history">
          {historyLoading ? (
            <p>Loading…</p>
          ) : history.length === 0 ? (
            <p>No changes recorded yet.</p>
          ) : (
            history.map((h) => (
              <div className="msj-prayer-history-row" key={h.id}>
                <div>
                  <strong>{t(`prayer.${h.prayerName.toLowerCase()}`, h.prayerName)}</strong>{" "}
                  effective {h.effectiveDate}: {h.oldValue || "not set"} → {h.newValue}
                </div>
                <div className="msj-prayer-history-meta">
                  {h.actorName || "Unknown"} · {new Date(h.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {verifyModal && (
        <div className="msj-modal-overlay" onClick={closeVerifyModal}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Unusual Prayer Time</h3>
            <p>Please review before saving — this doesn't block saving, it's just worth double-checking:</p>
            <ul className="msj-prayer-warning-list">
              {verifyModal.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
            </ul>
            <div className="msj-modal-actions">
              <button type="button" className="btn btn-outline-ink" onClick={closeVerifyModal} disabled={verifyBusy}>Go Back &amp; Edit</button>
              <button type="button" className="btn btn-gold" onClick={confirmSaveAnyway} disabled={verifyBusy}>
                {verifyBusy ? "Saving…" : "Save Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrayerRosterSection;
