import AuthSettings from "../models/AuthSettings.js";

export async function ensureAuthSettings() {
  const existing = await AuthSettings.findByPk(1);
  if (!existing) {
    await AuthSettings.create({ id: 1, otpExpiryMinutes: 5, otpResendCooldownSeconds: 60, otpMaxAttempts: 5 });
  }
}
