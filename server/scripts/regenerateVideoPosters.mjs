// One-off: regenerates the poster thumbnail (with the new brightness lift)
// for existing community_post activities that already have a video but no
// poster yet, or whose poster predates this brightness change. Targets the
// two "testing" posts made while diagnosing the black-thumbnail bug, so the
// user sees the brighter result on the exact posts they were looking at,
// without needing a fresh upload. Safe to re-run.
import "dotenv/config";
import path from "path";
import { Op } from "sequelize";
import { sequelize } from "../src/config/db.js";
import CommunityActivity from "../src/models/CommunityActivity.js";
import { generateVideoThumbnail } from "../src/utils/videoThumbnail.js";

try {
  const posts = await CommunityActivity.findAll({
    where: { type: "community_post", mediaVideoUrl: { [Op.ne]: null } },
    order: [["createdAt", "DESC"]],
    limit: 5,
  });

  for (const post of posts) {
    const absPath = path.resolve(`.${post.mediaVideoUrl}`);
    const dir = path.dirname(absPath);
    const posterFileName = await generateVideoThumbnail(absPath, dir);
    if (!posterFileName) {
      console.log(`FAILED to regenerate poster for activity ${post.id} (${absPath})`);
      continue;
    }
    const newUrl = `/uploads/wall-post-media/${posterFileName}`;
    post.mediaVideoPosterUrl = newUrl;
    await post.save();
    console.log(`Activity ${post.id}: poster regenerated -> ${newUrl}`);
  }
} finally {
  await sequelize.close();
}
