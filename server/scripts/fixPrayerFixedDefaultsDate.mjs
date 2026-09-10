// One-off correction, run once via .github/workflows/fix-prayer-fixed-defaults-date.yml
// (see that file for full context). prayerCalculationEngine.js's first
// deployed version dated new Dhuhr/Jumu'ah/Asr/Isha default rows "today"
// instead of the start of the year; the code fix (dating new rows Jan 1)
// already shipped separately. This moves the handful of rows the buggy
// version already wrote during the short window it was live.
//
// Scoped tightly: only rows for these 4 prayer names, dated exactly the
// date this script runs on, whose time exactly matches this engine's own
// known default value for that prayer. Any row inserted by the engine is,
// by the engine's own "never write over an existing value" rule, one where
// nothing else governed that date — so relocating it to Jan 1 can never
// conflict with real data.
import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

const today = new Date().toISOString().slice(0, 10);
const yearStart = `${today.slice(0, 4)}-01-01`;
const defaults = { "Dhuhr": "13:00", "Jumu'ah": "13:30", "Asr": "16:30", "Isha": "20:30" };

for (const [name, time] of Object.entries(defaults)) {
  const result = await sequelize.query(
    `UPDATE masjid_prayer_timelines mpt
     JOIN prayer_masters pm ON pm.id = mpt.prayerId
     SET mpt.effectiveDate = :yearStart
     WHERE LOWER(pm.name) = LOWER(:name) AND mpt.effectiveDate = :today AND mpt.time = :time`,
    { replacements: { name, time, today, yearStart }, type: QueryTypes.UPDATE }
  );
  console.log(name, "-> raw result:", JSON.stringify(result));
}
console.log(`Done — moved matching rows dated ${today} to ${yearStart}.`);
await sequelize.close();
