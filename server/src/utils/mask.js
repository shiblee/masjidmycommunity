// Shared masking convention for surfaces where a user's contact details must
// stay partially hidden (OTP prompts, public wall posts, etc.) — the same
// rule everywhere so no surface accidentally reveals more than another.
export function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}

export function maskMobile(mobile) {
  return mobile.length <= 4 ? mobile : `${"*".repeat(mobile.length - 4)}${mobile.slice(-4)}`;
}
