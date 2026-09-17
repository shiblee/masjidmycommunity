// Read-only diagnostic — confirms the Requirement Module's schema and seed
// data actually landed on the real database after deploy (sequelize.sync
// runs on every server boot, but this session has no direct DB access to
// the live box otherwise). Run via
// .github/workflows/check-requirement-deployment.yml.
import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

async function tableExists(name) {
  const rows = await sequelize.query("SHOW TABLES LIKE :name", { replacements: { name }, type: QueryTypes.SELECT });
  return rows.length > 0;
}

console.log("--- Schema checks ---");
console.log("requirement_categories table exists:", await tableExists("requirement_categories"));
console.log("requirement_subcategories table exists:", await tableExists("requirement_subcategories"));
console.log("requirements table exists:", await tableExists("requirements"));

console.log("\n--- Seed data checks ---");
const [catCount] = await sequelize.query("SELECT COUNT(*) as c FROM requirement_categories", { type: QueryTypes.SELECT });
console.log("requirement_categories row count:", catCount.c);
const [subCount] = await sequelize.query("SELECT COUNT(*) as c FROM requirement_subcategories", { type: QueryTypes.SELECT });
console.log("requirement_subcategories row count:", subCount.c);
const categories = await sequelize.query("SELECT name FROM requirement_categories ORDER BY sortOrder", { type: QueryTypes.SELECT });
console.log("categories:", categories.map((c) => c.name).join(", "));

console.log("\n--- Email template check ---");
const [tpl] = await sequelize.query("SELECT `key`, status, quoteEnabled FROM email_templates WHERE `key` = 'requirement_submitted_confirmation'", { type: QueryTypes.SELECT });
console.log("requirement_submitted_confirmation template:", tpl || "NOT FOUND");

process.exit(0);
