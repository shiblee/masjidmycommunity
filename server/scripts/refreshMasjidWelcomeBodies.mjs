// One-off: regenerates the `body` of every existing masjid_approved
// CommunityActivity using the current composeMasjidWelcomeBody() — picks up
// the @[masjid:id:name] mention token and #masjidmycommunity hashtag added
// after the initial backfill already ran. Safe to re-run any time this
// copy changes again; only ever touches masjid_approved rows.
import "dotenv/config";
import { sequelize } from "../src/config/db.js";
import CommunityActivity from "../src/models/CommunityActivity.js";
import Masjid from "../src/models/Masjid.js";
import { composeMasjidWelcomeBody } from "../src/services/communityActivityService.js";

const activities = await CommunityActivity.findAll({ where: { type: "masjid_approved" } });
let updated = 0;
let skipped = 0;

for (const activity of activities) {
  const masjid = activity.relatedMasjidId ? await Masjid.findByPk(activity.relatedMasjidId) : null;
  if (!masjid) {
    skipped += 1;
    continue;
  }
  activity.body = composeMasjidWelcomeBody(masjid);
  await activity.save();
  updated += 1;
}

console.log(`Updated ${updated} masjid_approved posts, skipped ${skipped} (no related masjid found).`);
await sequelize.close();
