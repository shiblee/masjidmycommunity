import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../../components/Icons.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";
import { formatPrayerTime } from "../../utils/formatPrayerTime.js";
import { useNextPrayer } from "../../hooks/useNextPrayer.js";
import PrayerAlertBanner from "../../components/prayer/PrayerAlertBanner.jsx";

const API = `${API_BASE}/masjids/public`;

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Read-only, always "today" — the owner/admin roster tools decide what
// today's effective time is (override -> recurring -> none); this just
// displays whatever that resolves to, the same way for every visitor.
function PrayerTimesTab({ masjidId }) {
  const { t } = useTranslation();
  const [roster, setRoster] = useState(null);
  const [date, setDate] = useState(null);
  const [timezone, setTimezone] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/${masjidId}/prayer-times`)
      .then(({ data }) => {
        setRoster(data.roster || []);
        setDate(data.date);
        setTimezone(data.timezone || null);
      })
      .catch(() => setError(true));
  }, [masjidId]);

  const fetchRoster = useCallback(
    (dateStr) => axios.get(`${API}/${masjidId}/prayer-times`, { params: { date: dateStr } }).then(({ data }) => data.roster || []),
    [masjidId]
  );

  const { next, h, m, s, alarmOn, toggleAlarm, unlockAudio, banner } = useNextPrayer({
    masjidId,
    timezone,
    todayDateStr: date,
    todayRoster: roster || [],
    fetchRoster,
    enabled: !!roster && roster.length > 0,
  });

  if (error) return <p className="msj-review-empty">Couldn't load prayer times right now.</p>;
  if (!roster) return <p className="msj-review-empty">Loading…</p>;

  return (
    <div className="msj-hub-prayer">
      <div className="msj-hub-prayer-head">
        <h3><Icon name="clock" size={16} /> {t("prayer.rosterHeading", "Today's Prayer Times")}</h3>
        <span className="msj-hub-prayer-date">{todayLabel()}</span>
      </div>
      {roster.length === 0 ? (
        <p className="msj-review-empty">This masjid hasn't published its prayer times yet.</p>
      ) : (
        <div className="msj-review-prayer-grid">
          {roster.map((p) => {
            const isNext = next && next.prayerId === p.prayerId && next.dateStr === date;
            return (
              <div className={`msj-review-prayer-card${isNext ? " msj-review-prayer-card-next" : ""}`} key={p.prayerId} onClick={isNext ? unlockAudio : undefined}>
                <span className="msj-review-prayer-name">{t(`prayer.${p.name.toLowerCase()}`, p.name)}</span>
                <span className="msj-review-prayer-time">{formatPrayerTime(p.time)}</span>
                {isNext && (
                  <>
                    <span className="msj-review-prayer-countdown">
                      {h}:{m}:{s}
                    </span>
                    <button
                      type="button"
                      className={`msj-review-prayer-bell${alarmOn ? " on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAlarm();
                      }}
                      aria-pressed={alarmOn}
                      aria-label={alarmOn ? t("prayer.next.alarmOn", "Alarm ON") : t("prayer.next.alarmOff", "Alarm OFF")}
                    >
                      <Icon name={alarmOn ? "bell" : "bellOff"} size={12} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      <PrayerAlertBanner text={banner} />
    </div>
  );
}

export default PrayerTimesTab;
