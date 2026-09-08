// Single source of truth for the synthetic-user email domain — referenced
// by both the generator (syntheticUserGeneratorService.js, to assign it)
// and emailService.js (to refuse to ever send to it), so the two can never
// drift apart. Own-domain, not a real provider (Gmail/Yahoo/Rediffmail/...)
// — see syntheticUserGeneratorService.js's comment for why.
export const BOT_EMAIL_DOMAIN = "mail.masjidmycommunity.com";
