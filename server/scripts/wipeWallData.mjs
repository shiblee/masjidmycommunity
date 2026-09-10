// One-off, explicitly user-requested full reset of the Community Wall:
// every post (all CommunityActivity types), every comment/reply, every
// post/comment/image like-vote, every post image, and any content report
// filed against any of them. Run via
// .github/workflows/wipe-wall-data.yml — irreversible, no backup taken
// (explicitly declined by the requester). Does NOT touch the underlying
// Job/Masjid/Campaign/Donation/User records those activities referenced —
// only their appearance as a wall post/comment/like goes away.
//
// Deletes in child-before-parent order so this is safe whether or not the
// DB enforces real FK constraints (these models mostly don't declare
// `references:`, but this order is correct either way), all inside one
// transaction so it's all-or-nothing.
import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import { QueryTypes } from "sequelize";

async function run(sql, t) {
  const result = await sequelize.query(sql, { type: QueryTypes.DELETE, transaction: t });
  return result;
}

const t = await sequelize.transaction();
try {
  console.log("comment_votes:", await run("DELETE FROM comment_votes", t));
  console.log(
    "content_reports (activity/comment/image):",
    await run("DELETE FROM content_reports WHERE targetType IN ('activity','comment','image')", t)
  );
  console.log("comments:", await run("DELETE FROM comments", t));
  console.log("post_image_votes:", await run("DELETE FROM post_image_votes", t));
  console.log("post_images:", await run("DELETE FROM post_images", t));
  console.log("community_activity_votes:", await run("DELETE FROM community_activity_votes", t));
  console.log("community_activities:", await run("DELETE FROM community_activities", t));

  await t.commit();
  console.log("Committed — wall fully reset.");
} catch (error) {
  await t.rollback();
  console.error("Rolled back, nothing was deleted. Error:", error.message);
  process.exitCode = 1;
}

await sequelize.close();
