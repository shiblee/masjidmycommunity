// Read-only: reports how many bot users exist, how many currently have a
// bot-generated photo (any "/uploads/profile-photos/bot-*" file -- the old
// SVG identicon or an earlier photo-source pass, all safe to replace), and
// how many have a genuine non-bot-generated photo or none at all. Run
// before backfillBotProfilePhotos.mjs to know the scope.
import "dotenv/config";
import { Op } from "sequelize";
import { sequelize } from "../src/config/db.js";
import User from "../src/models/User.js";

try {
  const [totalBots, noPhoto, botGenerated, otherPhoto] = await Promise.all([
    User.count({ where: { userType: "bot" } }),
    User.count({ where: { userType: "bot", profilePhoto: null } }),
    User.count({ where: { userType: "bot", profilePhoto: { [Op.like]: "/uploads/profile-photos/bot-%" } } }),
    User.count({
      where: {
        userType: "bot",
        [Op.and]: [{ profilePhoto: { [Op.ne]: null } }, { profilePhoto: { [Op.notLike]: "/uploads/profile-photos/bot-%" } }],
      },
    }),
  ]);
  console.log("Total bot users:", totalBots);
  console.log("  - with no profile photo:", noPhoto);
  console.log("  - with a bot-generated photo (replaceable):", botGenerated);
  console.log("  - with some other (non-bot-generated) photo:", otherPhoto);
  console.log("Backfill candidates (no photo + bot-generated):", noPhoto + botGenerated);
} finally {
  await sequelize.close();
}
