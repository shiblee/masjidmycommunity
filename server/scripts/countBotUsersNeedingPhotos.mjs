// Read-only: reports how many bot users exist, how many already have a
// real (non-SVG) profile photo, how many still have the old SVG identicon,
// and how many have none at all -- run before backfillBotProfilePhotos.mjs
// to know the scope.
import "dotenv/config";
import { Op } from "sequelize";
import { sequelize } from "../src/config/db.js";
import User from "../src/models/User.js";

try {
  const [totalBots, noPhoto, oldSvg, realPhoto] = await Promise.all([
    User.count({ where: { userType: "bot" } }),
    User.count({ where: { userType: "bot", profilePhoto: null } }),
    User.count({ where: { userType: "bot", profilePhoto: { [Op.like]: "/uploads/profile-photos/bot-%.svg" } } }),
    User.count({ where: { userType: "bot", profilePhoto: { [Op.and]: [{ [Op.ne]: null }, { [Op.notLike]: "/uploads/profile-photos/bot-%.svg" }] } } }),
  ]);
  console.log("Total bot users:", totalBots);
  console.log("  - with no profile photo:", noPhoto);
  console.log("  - with the old SVG identicon:", oldSvg);
  console.log("  - with a real (already-backfilled or otherwise) photo:", realPhoto);
  console.log("Backfill candidates (no photo + old SVG):", noPhoto + oldSvg);
} finally {
  await sequelize.close();
}
