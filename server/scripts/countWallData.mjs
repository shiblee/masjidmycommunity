// Read-only reconnaissance for a possible full wall-data wipe — reports
// exact row counts, never deletes anything. Run via
// .github/workflows/count-wall-data.yml.
import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

async function count(sql) {
  const [row] = await sequelize.query(sql, { type: QueryTypes.SELECT });
  return row.c;
}

const byType = await sequelize.query(
  "SELECT type, COUNT(*) as c FROM community_activities GROUP BY type ORDER BY c DESC",
  { type: QueryTypes.SELECT }
);
console.log("community_activities by type:");
for (const row of byType) console.log(`  ${row.type}: ${row.c}`);
console.log("community_activities TOTAL:", await count("SELECT COUNT(*) as c FROM community_activities"));

console.log("community_activity_votes:", await count("SELECT COUNT(*) as c FROM community_activity_votes"));
console.log("comments TOTAL:", await count("SELECT COUNT(*) as c FROM comments"));
console.log("comments top-level (parentId IS NULL):", await count("SELECT COUNT(*) as c FROM comments WHERE parentId IS NULL"));
console.log("comments replies (parentId IS NOT NULL):", await count("SELECT COUNT(*) as c FROM comments WHERE parentId IS NOT NULL"));
console.log("comment_votes:", await count("SELECT COUNT(*) as c FROM comment_votes"));
console.log("post_images:", await count("SELECT COUNT(*) as c FROM post_images"));
console.log("post_image_votes:", await count("SELECT COUNT(*) as c FROM post_image_votes"));
console.log("content_reports (targetType IN activity/comment):", await count("SELECT COUNT(*) as c FROM content_reports WHERE targetType IN ('activity','comment','image')"));

await sequelize.close();
