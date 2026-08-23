import EmailTemplate from "../models/EmailTemplate.js";
import EmailSettings from "../models/EmailSettings.js";

const DEFAULT_TEMPLATES = [
  {
    key: "otp_verification",
    name: "OTP Verification",
    purpose: "Sent when a user registers with an email address, to verify ownership before activating the account.",
    subject: "Your Masjid My Community verification code",
    heading: "Verify Your Account",
    message:
      "Welcome to {{platform_name}}.\n\nTo complete your registration and verify your account, please use the verification code below. This code is valid for 5 minutes — please do not share it with anyone. If you did not request this, you can safely ignore this email.",
    ctaText: null,
    ctaLink: null,
    footerText:
      "{{platform_name}} — Empowering Masjids. Strengthening Communities.\nNeed help? Contact us at hello@masjidmycommunity.org\n© {{current_year}} {{platform_name}}. All rights reserved.",
    quoteEnabled: true,
    quoteTransliteration: "Fa inna ma'al-'usri yusra",
    quoteTranslation: "Indeed, with hardship comes ease.",
    quoteSource: "Qur'an 94:5 (Surah Ash-Sharh)",
    status: "active",
    availableVariables: ["user_name", "otp_code", "platform_name", "current_year"],
  },
  {
    key: "welcome_registration",
    name: "Registration Successful / Welcome Email",
    purpose: "Sent automatically once a user's account is verified and successfully activated.",
    subject: "Welcome to Masjid My Community!",
    heading: "Welcome to Masjid My Community!",
    message:
      "Your account has been successfully verified and registered.\n\nYou are now part of a growing community working towards a shared vision: Empowering Masjids. Strengthening Communities.\n\n{{platform_name}} connects communities, supporters and masjids to create meaningful, transparent impact — from registering a masjid, to launching a campaign, to tracking real progress.",
    ctaText: "Start Your Journey",
    ctaLink: "http://localhost:5173/account",
    footerText:
      "{{platform_name}} — Empowering Masjids. Strengthening Communities.\nNeed help? Contact us at hello@masjidmycommunity.org\n© {{current_year}} {{platform_name}}. All rights reserved.",
    quoteEnabled: true,
    quoteTransliteration: "Man banaa masjidan lillah, banallahu lahu baytan fil-jannah",
    quoteTranslation: "Whoever builds a masjid for the sake of Allah, Allah will build for him a house in Paradise.",
    quoteSource: "Sahih Muslim 533; also narrated in Sahih al-Bukhari 450",
    status: "active",
    availableVariables: ["user_name", "platform_name", "current_year"],
  },
];

export async function ensureEmailDefaults() {
  for (const tpl of DEFAULT_TEMPLATES) {
    await EmailTemplate.findOrCreate({ where: { key: tpl.key }, defaults: tpl });
  }
  await EmailSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1 } });
}
