import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// The owner-of-record for masjids an admin registers directly (rather than
// a real masjid committee going through the public wizard) — surfaces as
// "Masjid My Community" wherever a masjid's registering identity is shown
// (e.g. the admin masjid list's "Registered By" column), instead of a
// blank or arbitrary owner. `Masjid.userId` is a required foreign key with
// no separate "admin-created" concept, so this account exists to fill it.
const PLATFORM_EMAIL = "platform@masjidmycommunity.org";

export async function ensurePlatformUserDefaults() {
  const existing = await User.findOne({ where: { email: PLATFORM_EMAIL } });
  if (existing) return existing;

  // Random, never-shared password — this account has no interactive login
  // flow and isn't meant to ever sign in; the hash just satisfies the
  // model's NOT NULL constraint.
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const hashed = await bcrypt.hash(randomPassword, 10);

  return User.create({
    fullName: "Masjid My Community",
    username: "masjidmycommunity",
    email: PLATFORM_EMAIL,
    password: hashed,
    registrationMethod: "email",
    emailVerified: true,
    status: "active",
  });
}

export { PLATFORM_EMAIL };
