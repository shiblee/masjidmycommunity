// One-off: directly invoke the (idempotent, additive-only) prayer
// calculation engine for masjid 110 and print the result, to debug why the
// background scheduler's tick doesn't seem to have backfilled its past
// window. Safe to run any number of times -- ensurePrayerScheduleForMasjid
// never overwrites an existing governing row.
import "dotenv/config";
import { ensurePrayerScheduleForMasjid } from "../src/services/prayerCalculationEngine.js";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

console.log("Calling ensurePrayerScheduleForMasjid(110)...");
const result = await ensurePrayerScheduleForMasjid(110);
console.log("Result:", JSON.stringify(result));

const rows = await sequelize.query(
  `SELECT mpt.effectiveDate, mpt.time, pm.name as prayerName
   FROM masjid_prayer_timelines mpt
   JOIN prayer_masters pm ON pm.id = mpt.prayerId
   WHERE mpt.masjidId = 110 AND LOWER(pm.name) IN ('fajr','maghrib')
     AND mpt.effectiveDate BETWEEN '2026-09-01' AND '2026-09-10'
   ORDER BY pm.name, mpt.effectiveDate`,
  { type: QueryTypes.SELECT }
);
console.log("Sept 1-10 rows after direct call:", JSON.stringify(rows, null, 2));

await sequelize.close();
