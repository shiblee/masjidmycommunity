import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../../components/Icons.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";
import { formatPrayerTime } from "../../utils/formatPrayerTime.js";

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
  const [error, setError] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/${masjidId}/prayer-times`)
      .then(({ data }) => setRoster(data.roster || []))
      .catch(() => setError(true));
  }, [masjidId]);

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
          {roster.map((p) => (
            <div className="msj-review-prayer-card" key={p.prayerId}>
              <span className="msj-review-prayer-name">{t(`prayer.${p.name.toLowerCase()}`, p.name)}</span>
              <span className="msj-review-prayer-time">{formatPrayerTime(p.time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PrayerTimesTab;
