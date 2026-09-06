import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/Icons.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const SOURCE_META = {
  override: { label: "Date-Specific Override", cls: "override" },
  manual: { label: "Manually Set", cls: "manual" },
  recurring: { label: "Recurring Roster", cls: "recurring" },
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

// Reused as-is for the admin "Prayer Times" tab (Phase 4) by pointing `api`
// at the admin-authenticated axios instance instead of masjidApi — the
// effective-time priority (override -> recurring -> none) always comes from
// the same server-side service either way.
function PrayerRosterSection({ basePath, api }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayStr);
  const [view, setView] = useState("list");
  const [roster, setRoster] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [scope, setScope] = useState("recurring");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(() => monthOf(todayStr()));
  const [overrideDates, setOverrideDates] = useState([]);
  const [modal, setModal] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");

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

  const loadOverrideDates = useCallback(() => {
    api
      .get(`${basePath}/prayer-times/overrides`, { params: { year: calMonth.year, month: calMonth.month } })
      .then(({ data }) => setOverrideDates(data.dates))
      .catch(() => {});
  }, [api, basePath, calMonth]);

  useEffect(() => {
    if (view === "calendar") loadOverrideDates();
  }, [view, loadOverrideDates]);

  const save = async () => {
    const entries = roster
      .filter((r) => drafts[r.prayerId] && drafts[r.prayerId] !== r.time)
      .map((r) => ({ prayerId: r.prayerId, time: drafts[r.prayerId], scope }));
    if (!entries.length) {
      setNotice("No changes to save.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(`${basePath}/prayer-times`, { date, entries });
      setRoster(data.roster);
      setNotice("Prayer times saved.");
      if (historyOpen) loadHistory();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save prayer times.");
    } finally {
      setSaving(false);
    }
  };

  const hasDrafts = roster.some((r) => drafts[r.prayerId] && drafts[r.prayerId] !== r.time);

  const openModal = (type) => {
    setModalError("");
    if (type === "copy-day") {
      setModal({ type, fromDate: shiftDate(date, -1), toDate: date });
    } else if (type === "copy-week") {
      setModal({ type, fromDate: shiftDate(date, -7), toDate: date });
    } else if (type === "copy-to") {
      setModal({ type, fromDate: date, toDate: shiftDate(date, 1) });
    } else if (type === "apply-range") {
      setModal({ type, templateDate: date, startDate: date, endDate: shiftDate(date, 6) });
    }
  };

  const closeModal = () => {
    if (modalBusy) return;
    setModal(null);
    setModalError("");
  };

  const confirmModal = async () => {
    if (!modal) return;
    setModalBusy(true);
    setModalError("");
    try {
      if (modal.type === "apply-range") {
        const { data } = await api.post(`${basePath}/prayer-times/apply-range`, {
          templateDate: modal.templateDate, startDate: modal.startDate, endDate: modal.endDate,
        });
        setNotice(`Applied to ${data.appliedDates.length} date${data.appliedDates.length === 1 ? "" : "s"}.`);
      } else {
        const { data } = await api.post(`${basePath}/prayer-times/copy`, {
          fromDate: modal.fromDate, toDate: modal.toDate,
        });
        setNotice(`Copied to ${formatDateShort(modal.toDate)}.`);
        if (modal.toDate === date) setRoster(data.roster);
      }
      setModal(null);
      if (modal.toDate === date || modal.type === "apply-range") loadRoster();
      if (historyOpen) loadHistory();
      if (view === "calendar") loadOverrideDates();
    } catch (err) {
      setModalError(err.response?.data?.message || "Couldn't complete this action.");
    } finally {
      setModalBusy(false);
    }
  };

  const calDays = daysInMonth(calMonth.year, calMonth.month);
  const calLeadBlanks = firstWeekdayOfMonth(calMonth.year, calMonth.month);
  const overrideSet = new Set(overrideDates);

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
              const isOverride = overrideSet.has(dayStr);
              const isSelected = dayStr === date;
              const isToday = dayStr === todayStr();
              return (
                <button
                  type="button"
                  key={dayStr}
                  className={`msj-prayer-cal-day${isOverride ? " has-override" : ""}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
                  onClick={() => { setDate(dayStr); setView("list"); }}
                  title={isOverride ? "Has a date-specific override" : undefined}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="msj-prayer-calendar-legend">
            <span><i className="msj-prayer-legend-dot has-override" /> Date-specific override</span>
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
                return (
                  <div className="msj-prayer-row" key={r.prayerId}>
                    <div className="msj-prayer-row-name">
                      <strong>{t(`prayer.${r.name.toLowerCase()}`, r.name)}</strong>
                      {r.category && <span className="msj-prayer-cat">{r.category}</span>}
                    </div>
                    <input
                      type="time"
                      className="msj-prayer-time"
                      value={drafts[r.prayerId] || ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.prayerId]: e.target.value }))}
                    />
                    <span className={`msj-prayer-badge msj-prayer-badge-${meta.cls}`}>{meta.label}</span>
                    <span className="msj-prayer-updated">
                      {r.updatedAt ? `Updated ${new Date(r.updatedAt).toLocaleDateString()}` : "Not set"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {roster.length > 0 && (
            <>
              <div className="msj-prayer-savebar">
                <div className="msj-prayer-scope">
                  <label>
                    <input type="radio" name="prayer-scope" checked={scope === "recurring"} onChange={() => setScope("recurring")} />
                    Set as the yearly default for this date
                  </label>
                  <label>
                    <input type="radio" name="prayer-scope" checked={scope === "override"} onChange={() => setScope("override")} />
                    Only for {date}
                  </label>
                </div>
                <button type="button" className="btn btn-gold" onClick={save} disabled={saving || !hasDrafts}>
                  {saving ? "Saving…" : "Save Prayer Times"}
                </button>
              </div>

              <div className="msj-prayer-bulkbar">
                <span className="msj-prayer-bulklabel">Bulk actions:</span>
                <button type="button" onClick={() => openModal("copy-day")}>Copy Previous Day</button>
                <button type="button" onClick={() => openModal("copy-week")}>Copy Previous Week</button>
                <button type="button" onClick={() => openModal("copy-to")}>Copy to Another Date</button>
                <button type="button" onClick={() => openModal("apply-range")}>Apply to Date Range</button>
              </div>
            </>
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
                  <span className="msj-prayer-history-type">
                    {h.changeType === "date_override" ? "date override" : "yearly default"}
                  </span>{" "}
                  for {h.effectiveDate}: {h.oldValue || "not set"} → {h.newValue}
                </div>
                <div className="msj-prayer-history-meta">
                  {h.actorName || "Unknown"} · {new Date(h.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {modal && (
        <div className="msj-modal-overlay" onClick={closeModal}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            {modal.type === "apply-range" ? (
              <>
                <h3>Apply to Date Range</h3>
                <p>Copies the prayer times currently shown for <strong>{formatDateShort(modal.templateDate)}</strong> onto every date in the range below, as an override for each date. This will overwrite any existing timings in the range.</p>
                <label className="msj-modal-field">
                  Start date
                  <input type="date" value={modal.startDate} onChange={(e) => setModal((m) => ({ ...m, startDate: e.target.value }))} />
                </label>
                <label className="msj-modal-field">
                  End date
                  <input type="date" value={modal.endDate} onChange={(e) => setModal((m) => ({ ...m, endDate: e.target.value }))} />
                </label>
              </>
            ) : modal.type === "copy-to" ? (
              <>
                <h3>Copy to Another Date</h3>
                <p>Copies the prayer times currently shown for <strong>{formatDateShort(modal.fromDate)}</strong> onto the date below, as an override. This will overwrite any existing timings on that date.</p>
                <label className="msj-modal-field">
                  Copy to
                  <input type="date" value={modal.toDate} onChange={(e) => setModal((m) => ({ ...m, toDate: e.target.value }))} />
                </label>
              </>
            ) : (
              <>
                <h3>{modal.type === "copy-day" ? "Copy Previous Day" : "Copy Previous Week"}</h3>
                <p>
                  Copies prayer times from <strong>{formatDateShort(modal.fromDate)}</strong> onto <strong>{formatDateShort(modal.toDate)}</strong>, as an override.
                  This will overwrite any existing timings on {formatDateShort(modal.toDate)}.
                </p>
              </>
            )}
            {modalError && <span className="auth-field-error" style={{ display: "block", margin: "8px 0" }}>{modalError}</span>}
            <div className="msj-modal-actions">
              <button type="button" className="btn btn-outline-ink" onClick={closeModal} disabled={modalBusy}>Cancel</button>
              <button type="button" className="btn btn-gold" onClick={confirmModal} disabled={modalBusy}>
                {modalBusy ? "Applying…" : "Confirm & Overwrite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrayerRosterSection;
