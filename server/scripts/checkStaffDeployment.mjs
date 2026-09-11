import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

async function columnExists(table, column) {
  const rows = await sequelize.query(`SHOW COLUMNS FROM \`${table}\` LIKE :column`, { replacements: { column }, type: QueryTypes.SELECT });
  return rows.length > 0;
}
async function tableExists(name) {
  const rows = await sequelize.query("SHOW TABLES LIKE :name", { replacements: { name }, type: QueryTypes.SELECT });
  return rows.length > 0;
}

console.log("admin_users.permissions exists:", await columnExists("admin_users", "permissions"));
console.log("admin_activity_logs table exists:", await tableExists("admin_activity_logs"));

const admins = await sequelize.query("SELECT id, email, role, status FROM admin_users", { type: QueryTypes.SELECT });
console.log("admin_users rows:", JSON.stringify(admins, null, 2));

const recentLogs = await sequelize.query(
  "SELECT adminUserId, email, activityType, status, sessionId, ipAddress, browser, os, deviceType, createdAt FROM admin_activity_logs ORDER BY createdAt DESC LIMIT 5",
  { type: QueryTypes.SELECT }
);
console.log("Recent admin_activity_logs rows:", JSON.stringify(recentLogs, null, 2));

await sequelize.close();
