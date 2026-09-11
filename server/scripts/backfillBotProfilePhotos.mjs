// One-time backfill (intentionally NOT self-cleaning -- this is meant to
// persist real photos, not a verification script): finds every bot-
// registered user (userType: "bot") who either has no profile photo at
// all, or still has a bot-generated photo from a previous pass (the
// "/uploads/profile-photos/bot-<username>.*" pattern -- the old SVG
// identicon, or an earlier low-res/non-Indian photo source), and gives
// each a real, high-resolution, Indian-representative human photograph
// via the same generateRealisticProfilePhoto() the live registration flow
// now uses. Only a filename starting with "bot-" is ever touched -- a
// genuine user-uploaded photo (named "<timestamp>-<random><ext>" by
// multer, never "bot-*") is never matched by this pattern, so this script
// can safely be re-run whenever the photo-generation approach improves
// without risking a real user's own photo.
//
// Safe to re-run: only ever UPDATES an existing row's profilePhoto field
// (never creates a user), and a user who already has a non-bot-generated
// photo is skipped outright, so a real uploaded photo is never touched.
import "dotenv/config";
import fs from "fs";
import { Op } from "sequelize";
import { sequelize } from "../src/config/db.js";
import User from "../src/models/User.js";
import { generateRealisticProfilePhoto } from "../src/utils/realisticPhotoService.js";

const BOT_GENERATED_PATTERN = /^\/uploads\/profile-photos\/bot-.+$/;
const DELAY_MS = 300; // be a good citizen of the free Pexels API tier

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

try {
  const candidates = await User.findAll({
    where: {
      userType: "bot",
      [Op.or]: [{ profilePhoto: null }, { profilePhoto: { [Op.like]: "/uploads/profile-photos/bot-%" } }],
    },
    attributes: ["id", "username", "gender", "profilePhoto"],
  });

  console.log(`Found ${candidates.length} bot user(s) needing a real profile photo.`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const user = candidates[i];
    // Idempotency guard -- if this exact row somehow already has a
    // non-bot-generated (i.e. genuinely uploaded) photo by the time we
    // get to it (e.g. a concurrent run), leave it alone.
    if (user.profilePhoto && !BOT_GENERATED_PATTERN.test(user.profilePhoto)) continue;

    const oldPhoto = user.profilePhoto;
    const newPhoto = await generateRealisticProfilePhoto(user.username, user.gender);

    if (!newPhoto) {
      failed++;
      console.error(`[${i + 1}/${candidates.length}] FAILED for ${user.username} (id ${user.id}) -- left as-is.`);
    } else {
      user.profilePhoto = newPhoto;
      await user.save();
      updated++;
      if (oldPhoto && BOT_GENERATED_PATTERN.test(oldPhoto) && oldPhoto !== newPhoto) {
        fs.unlink(`.${oldPhoto}`, () => {}); // best-effort cleanup of the superseded file
      }
      if ((i + 1) % 10 === 0 || i === candidates.length - 1) {
        console.log(`[${i + 1}/${candidates.length}] updated ${user.username} (id ${user.id}) -> ${newPhoto}`);
      }
    }

    await sleep(DELAY_MS);
  }

  console.log(`Done. Updated: ${updated}, failed: ${failed}, total candidates: ${candidates.length}.`);
} finally {
  await sequelize.close();
}
