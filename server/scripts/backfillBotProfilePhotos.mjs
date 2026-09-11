// One-time backfill (intentionally NOT self-cleaning -- this is meant to
// persist real photos, not a verification script): finds every bot-
// registered user (userType: "bot") who either has no profile photo at
// all, or still has the old hand-rolled SVG identicon (the
// "/uploads/profile-photos/bot-<username>.svg" pattern this replaces),
// and gives each a real, gender-matched human photograph via the same
// generateRealisticProfilePhoto() the live registration flow now uses.
//
// Safe to re-run: only ever UPDATES an existing row's profilePhoto field
// (never creates a user), and a user who already has a real (non-SVG)
// photo -- including one this script already assigned on a prior run --
// is skipped outright, so nothing gets re-downloaded or overwritten.
import "dotenv/config";
import fs from "fs";
import { Op } from "sequelize";
import { sequelize } from "../src/config/db.js";
import User from "../src/models/User.js";
import { generateRealisticProfilePhoto } from "../src/utils/realisticPhotoService.js";

const OLD_SVG_PATTERN = /^\/uploads\/profile-photos\/bot-.+\.svg$/;
const DELAY_MS = 150; // be a good citizen of the free randomuser.me API

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

try {
  const candidates = await User.findAll({
    where: {
      userType: "bot",
      [Op.or]: [{ profilePhoto: null }, { profilePhoto: { [Op.like]: "/uploads/profile-photos/bot-%.svg" } }],
    },
    attributes: ["id", "username", "gender", "profilePhoto"],
  });

  console.log(`Found ${candidates.length} bot user(s) needing a real profile photo.`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const user = candidates[i];
    // Idempotency guard -- if this exact row somehow already has a real
    // (non-SVG) photo by the time we get to it (e.g. a concurrent run),
    // leave it alone rather than overwriting a valid photo.
    if (user.profilePhoto && !OLD_SVG_PATTERN.test(user.profilePhoto)) continue;

    const oldPhoto = user.profilePhoto;
    const newPhoto = await generateRealisticProfilePhoto(user.username, user.gender);

    if (!newPhoto) {
      failed++;
      console.error(`[${i + 1}/${candidates.length}] FAILED for ${user.username} (id ${user.id}) -- left as-is.`);
    } else {
      user.profilePhoto = newPhoto;
      await user.save();
      updated++;
      if (oldPhoto && OLD_SVG_PATTERN.test(oldPhoto)) {
        fs.unlink(`.${oldPhoto}`, () => {}); // best-effort cleanup of the orphaned identicon file
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
