// Read-only diagnostic. For a sample of masjids with valid coordinates,
// reports how many distinct MasjidPrayerTimeline rows exist for Fajr and
// Maghrib, their effectiveDate range, and whether the values actually vary
// across the year (real astronomical schedule) or are stuck on a single
// legacy row (forward-filling one fixed value forever).
import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

// Full sweep: for every approved masjid with valid coordinates, count how
// many distinct Fajr/Maghrib times it has across its timeline — a masjid
// stuck on a single legacy value (never recalculated) shows up as a very
// low distinct-time count despite having many rows (or very few rows).
const summaryRows = await sequelize.query(
  `SELECT m.id, m.name,
          SUM(CASE WHEN LOWER(pm.name) = 'fajr' THEN 1 ELSE 0 END) as fajrRows,
          COUNT(DISTINCT CASE WHEN LOWER(pm.name) = 'fajr' THEN mpt.time END) as fajrDistinct,
          SUM(CASE WHEN LOWER(pm.name) = 'maghrib' THEN 1 ELSE 0 END) as maghribRows,
          COUNT(DISTINCT CASE WHEN LOWER(pm.name) = 'maghrib' THEN mpt.time END) as maghribDistinct
   FROM masjids m
   LEFT JOIN masjid_prayer_timelines mpt ON mpt.masjidId = m.id
   LEFT JOIN prayer_masters pm ON pm.id = mpt.prayerId AND LOWER(pm.name) IN ('fajr','maghrib')
   WHERE m.status = 'approved' AND m.latitude IS NOT NULL AND m.longitude IS NOT NULL
   GROUP BY m.id, m.name`,
  { type: QueryTypes.SELECT }
);
console.log(`Total approved masjids with coordinates: ${summaryRows.length}`);
const stuck = summaryRows.filter((r) => Number(r.fajrDistinct) <= 3 || Number(r.maghribDistinct) <= 3);
console.log(`Masjids with <=3 distinct Fajr or Maghrib times (likely stuck on a legacy value): ${stuck.length}`);
for (const s of stuck.slice(0, 30)) {
  console.log(`  id=${s.id} "${s.name}" fajrRows=${s.fajrRows} fajrDistinct=${s.fajrDistinct} maghribRows=${s.maghribRows} maghribDistinct=${s.maghribDistinct}`);
}
const noRows = summaryRows.filter((r) => Number(r.fajrRows) === 0);
console.log(`Masjids with ZERO Fajr rows at all: ${noRows.length}`);
for (const s of noRows.slice(0, 15)) console.log(`  id=${s.id} "${s.name}"`);

const [{ c: missingCoordsCount }] = await sequelize.query(
  `SELECT COUNT(*) as c FROM masjids WHERE status = 'approved' AND (latitude IS NULL OR longitude IS NULL)`,
  { type: QueryTypes.SELECT }
);
console.log(`\nApproved masjids WITHOUT coordinates (engine can't run for these): ${missingCoordsCount}`);

console.log("\n--- Deep-dive: masjid 114 ---");
const rows = await sequelize.query(
  `SELECT id, name, latitude, longitude, timezone FROM masjids WHERE id = 114`,
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
