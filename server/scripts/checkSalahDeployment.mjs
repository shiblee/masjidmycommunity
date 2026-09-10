// Read-only diagnostic — confirms the schema this session's features
// actually depend on is live on the real database (not just that the code
// deployed), since prior verification this session relied on network-mocked
// Playwright checks that never touched the real DB. Run via
// .github/workflows/check-salah-deployment.yml.
import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

async function tableExists(name) {
  const rows = await sequelize.query("SHOW TABLES LIKE :name", { replacements: { name }, type: QueryTypes.SELECT });
  return rows.length > 0;
}

async function columnExists(table, column) {
  const rows = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE :column`, { replacements: { column }, type: QueryTypes.SELECT });
  return rows.length > 0;
}

console.log("--- Schema checks ---");
console.log("salah_logs table exists:", await tableExists("salah_logs"));
console.log("users.primaryMasjidId exists:", await columnExists("users", "primaryMasjidId"));
console.log("users.primaryMasjidPromptSkippedAt exists:", await columnExists("users", "primaryMasjidPromptSkippedAt"));
console.log("masjids.timezone exists:", await columnExists("masjids", "timezone"));

console.log("\n--- Data checks ---");
const [prayerCount] = await sequelize.query("SELECT COUNT(*) as c FROM prayer_masters WHERE category = 'Fard'", { type: QueryTypes.SELECT });
console.log("PrayerMaster rows with category='Fard':", prayerCount.c);

const [usersWithPrimary] = await sequelize.query("SELECT COUNT(*) as c FROM users WHERE primaryMasjidId IS NOT NULL", { type: QueryTypes.SELECT });
console.log("Users with a primaryMasjidId set:", usersWithPrimary.c);

const [salahLogCount] = await sequelize.query("SELECT COUNT(*) as c FROM salah_logs", { type: QueryTypes.SELECT }).catch((e) => [{ c: `ERROR: ${e.message}` }]);
console.log("salah_logs row count:", salahLogCount.c);

await sequelize.close();
