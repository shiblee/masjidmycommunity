// Read-only diagnostic. For a sample of masjids with valid coordinates,
// reports how many distinct MasjidPrayerTimeline rows exist for Fajr and
// Maghrib, their effectiveDate range, and whether the values actually vary
// across the year (real astronomical schedule) or are stuck on a single
// legacy row (forward-filling one fixed value forever).
import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

const rows = await sequelize.query(
  `SELECT id, name, latitude, longitude, timezone FROM masjids
   WHERE status = 'approved' AND latitude IS NOT NULL AND longitude IS NOT NULL
   ORDER BY id DESC LIMIT 8`,
  { type: QueryTypes.SELECT }
);

for (const m of rows) {
  const timeline = await sequelize.query(
    `SELECT mpt.effectiveDate, mpt.time, pm.name as prayerName
     FROM masjid_prayer_timelines mpt
     JOIN prayer_masters pm ON pm.id = mpt.prayerId
     WHERE mpt.masjidId = :id AND LOWER(pm.name) IN ('fajr','maghrib')
     ORDER BY pm.name, mpt.effectiveDate`,
    { replacements: { id: m.id }, type: QueryTypes.SELECT }
  );
  const byPrayer = {};
  for (const r of timeline) {
    byPrayer[r.prayerName] = byPrayer[r.prayerName] || [];
    byPrayer[r.prayerName].push({ date: r.effectiveDate, time: r.time });
  }
  console.log(`\n--- Masjid ${m.id}: ${m.name} (lat=${m.latitude}, lng=${m.longitude}, tz=${m.timezone}) ---`);
  for (const prayer of ["Fajr", "Maghrib"]) {
    const entries = byPrayer[prayer] || [];
    const distinctTimes = new Set(entries.map((e) => e.time));
    console.log(
      `${prayer}: ${entries.length} row(s), ${distinctTimes.size} distinct time(s)`,
      entries.length ? `[${entries.slice(0, 3).map((e) => `${e.date}=${e.time}`).join(", ")}${entries.length > 3 ? " ..." : ""}]` : ""
    );
  }
}

await sequelize.close();
