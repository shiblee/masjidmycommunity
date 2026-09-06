import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/Icons.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const SOURCE_META = {
  override: { label: "Date-Specific Override", cls: "override" },
  manual: { label: "Manually Set", cls: "manual" },
  recurring: { label: "Recurring Roster", cls: "recurring" },
  none: { label: "Not Set", cls: "none" },
};

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

// Reused as-is for the admin "Prayer Times" tab (Phase 4) by pointing `api`
// at the admin-authenticated axios instance instead of masjidApi — the
// effective-time priority (override -> recurring -> none) always comes from
// the same server-side service either way.
function PrayerRosterSection({ masjidId, api }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayStr);
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

  const loadRoster = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get(`/${masjidId}/prayer-times`, { params: { date } })
      .then(({ data }) => {
        setRoster(data.roster);
        setDrafts(Object.fromEntries(data.roster.map((r) => [r.prayerId, r.time || ""])));
      })
      .catch(() => setError("Couldn't load prayer times for this date."))
      .finally(() => setLoading(false));
  }, [api, masjidId, date]);

  useEffect(() => {
    loadRoster();
    setNotice("");
  }, [loadRoster]);

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    api
      .get(`/${masjidId}/prayer-times/history`)
      .then(({ data }) => setHistory(data.entries))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [api, masjidId]);

  useEffect(() => {
    if (historyOpen) loadHistory();
  }, [historyOpen, loadHistory]);

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
      const { data } = await api.put(`/${masjidId}/prayer-times`, { date, entries });
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

  return (
    <div className="msj-summary-block msj-prayer-section">
      <div className="msj-summary-head">
        <h4><Icon name="clock" size={15} /> Prayer Time Management</h4>
        <button type="button" onClick={() => setHistoryOpen((v) => !v)}>
          {historyOpen ? "Hide changes" : "Recent changes"}
        </button>
      </div>

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
    </div>
  );
}

export default PrayerRosterSection;
