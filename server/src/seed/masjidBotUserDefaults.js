import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// The owner-of-record for masjids the Masjid Bot imports (see
// masjidDiscoveryService.js) — a *separate account* from PLATFORM_EMAIL
// (platformUserDefaults.js, used for masjids an admin adds by hand), even
// though both now display as "Masjid My Community": the actual
// distinguisher is Masjid.creationMethod ("admin" vs "bot_import") plus
// the "Bot Imported" badge in the admin UI, not the owner name text.
// Never meant to log in.
const MASJID_BOT_EMAIL = "masjid-bot@masjidmycommunity.org";

export async function ensureMasjidBotUserDefaults() {
  const existing = await User.findOne({ where: { email: MASJID_BOT_EMAIL } });
  if (existing) return existing;

  const randomPassword = crypto.randomBytes(32).toString("hex");
  const hashed = await bcrypt.hash(randomPassword, 10);

  return User.create({
    fullName: "Masjid My Community",
    username: "masjidmycommunitybot",
    email: MASJID_BOT_EMAIL,
    password: hashed,
    registrationMethod: "email",
    emailVerified: true,
    status: "active",
  });
}

export { MASJID_BOT_EMAIL };
